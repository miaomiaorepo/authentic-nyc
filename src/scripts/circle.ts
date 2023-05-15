import * as d3 from "d3";

import keywords from "../data/keywords.json";
import clusters from "../data/clusters.json";
import { Packer } from "./packer";

function drawCircle(width: number, height: number) {
  const MIN_WEIGHT_THRESHOLD = 0.08;

  interface Node {
    name: string;
    root?: string;
    value?: number;
    children?: Node[];
  }

  function convert(
    input: Record<string, Record<string, number>>,
    clusters: Record<string, { size: number }>,
    threshold: number
  ): Node {
    const output: Node = { name: "keywords", children: [] };

    for (const country in input) {
      const countryNode: Node = { name: country, root: country, children: [] };

      for (const keyword in input[country]) {
        const value = input[country][keyword];
        if (value < threshold) continue;
        const keywordNode: Node = {
          root: country,
          name: keyword,
          value: input[country][keyword],
        };
        countryNode.children!.push(keywordNode);
      }

      // sum up all the values of the children
      const totalValue = countryNode.children!.reduce(
        (acc, cur) => acc + (cur.value ?? 0),
        0
      );
      const scale = clusters[country].size / totalValue;
      countryNode.children!.forEach((child) => {
        child.value! *= scale;
      });

      output.children!.push(countryNode);
    }

    return output;
  }

  function zoomTo(v: [number, number, number]) {
    const k = Math.min(width, height) / v[2];

    view = v;

    label.attr(
      "transform",
      (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`
    );
    node.attr(
      "transform",
      (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`
    );
    node.attr("r", (d) => d.r * k);
  }

  function zoom(d: d3.HierarchyCircularNode<Node>, onZoomEnd?: () => void) {
    focus = d;

    const transition = svg
      .transition()
      .duration(1000)
      .tween("zoom", (_) => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        return (t) => zoomTo(i(t));
      });

    label
      .filter(function (d) {
        // @ts-ignore: Object is possibly 'null'.
        return d.parent === focus || this.style.display === "inline";
      })
      .transition(transition)
      .style("fill-opacity", (d) => (d.parent === focus ? 1 : 0))
      .on("start", function (d) {
        // @ts-ignore: Object is possibly 'null'.
        if (d.parent === focus) this.style.display = "inline";
      })
      .on("end", function (d) {
        // @ts-ignore: Object is possibly 'null'.
        if (d.parent !== focus) this.style.display = "none";
        if (onZoomEnd) onZoomEnd();
      });
  }

  function translateNode(
    node: d3.HierarchyCircularNode<Node>,
    [dx, dy]: [number, number]
  ) {
    node.x += dx;
    node.y += dy;
    if (node.children)
      node.children.forEach((child) => translateNode(child, [dx, dy]));
  }

  const cuisineColors: Record<string, string> = {
    African: "#F77234",
    Brazilian: "#7BE188",
    Caribbean: "#009A29",
    Chinese: "#FFB215",
    "Eastern European": "#FCC59F",
    Filipino: "#FF9A2E",
    French: "#F99057",
    German: "#FDDDC3",
    Greek: "#F76560",
    Indian: "#c5b0d5",
    Italian: "#EC3329",
    Japanese: "#F7BA1E",
    Korean: "#FF9A2E",
    "Latin American": "#23C343",
    Malaysian: "#FF7D00",
    Mediterranean: "#FBACA3",
    Mexican: "#40B137",
    "Middle Eastern": "#CC5120",
    Spanish: "#FDCDC5",
    Taiwanese: "#F9CC45",
    Thai: "#FFCF8B",
    Vietnamese: "#D25F00",
  };

  const root = d3.pack<Node>().size([width, height]).padding(3)(
    d3
      .hierarchy(convert(keywords, clusters, MIN_WEIGHT_THRESHOLD))
      .sum((d) => d.value!)
      .sort((a, b) => b.value! - a.value!)
  );
  const sortedChildren = Array.from(root.children!.sort((a, b) => a.r - b.r));
  const circles = Array.from(sortedChildren.map((d) => d.r));
  const packer = new Packer(circles, width / height);
  const packedCircles = Array.from(packer.list.sort((a, b) => a.r - b.r));
  sortedChildren.forEach((child, i) => {
    const dx = packedCircles[i].c.x - child.x;
    const dy = packedCircles[i].c.y - child.y;
    translateNode(child, [dx, dy]);
  });

  const [top, bottom, left, right] = [
    Math.min(...packedCircles.map((c) => c.c.y - c.r)),
    Math.max(...packedCircles.map((c) => c.c.y + c.r)),
    Math.min(...packedCircles.map((c) => c.c.x - c.r)),
    Math.max(...packedCircles.map((c) => c.c.x + c.r)),
  ];

  width = right - left;
  height = bottom - top;

  root.x = (right + left) / 2;
  root.y = (bottom + top) / 2;
  root.r = Math.min(width, height) / 2;

  let focus = root;
  let view: d3.ZoomView;

  const svg = d3
    .create("svg")
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
    .style("display", "block")
    // .style("margin", "0 400px")
    .style("background", "#f6ece0")
    .style("cursor", "pointer")
    .on("click", (_) => {
      zoom(root, () => highlight(null));
    });

  let highlightRoot: string | null = null;
  let highlightSource: "hover" | "zoom" | null = null;

  function highlight(
    root: string | null,
    source: "hover" | "zoom" | null = null
  ) {
    highlightRoot = root;
    highlightSource = source;
    updateFillColor(svg.selectAll("circle"));
  }

  function updateFillColor(
    circles: d3.Selection<
      d3.BaseType | SVGCircleElement,
      d3.HierarchyCircularNode<Node>,
      SVGGElement,
      undefined
    >
  ) {
    return circles.attr("fill-opacity", (d) => {
      if (d.data.root! === d.data.name) return 0;
      if (highlightRoot === null) {
        return 0.7;
      }
      if (highlightRoot === d.data.root) {
        return 1;
      }
      return 0.1;
    });
  }

  const node = svg
    .append("g")
    .selectAll("circle")
    .data(root.descendants().slice(1))
    .join("circle")
    .attr("fill", (d) => (d.children ? "white" : cuisineColors[d.data.root!]))
    .attr("pointer-events", (d) => (!d.children ? "none" : null))
    .on("mouseover", function ({ target }) {
      if (highlightSource !== "zoom") {
        // @ts-ignore
        highlight(d3.select(target).data()[0].data.root, "hover");
      }
    })
    .on("mouseout", function () {
      if (highlightSource !== "zoom") {
        highlight(null);
      }
    })
    .on("click", (event, d) => {
      if (focus !== d) {
        // @ts-ignore
        highlight(d3.select(event.target).data()[0].data.root, "zoom");
        zoom(d);
        event.stopPropagation();
      }
    });

  updateFillColor(node);

  const label = svg
    .append("g")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .selectAll("text")
    .data(root.descendants())
    .join("text")
    .style("font-size", "8px")
    .style("fill-opacity", (d) => (d.parent === root ? 1 : 0))
    .style("display", (d) => (d.parent === root ? "inline" : "none"))
    .text((d) => d.data.name);
  zoomTo([root.x, root.y, root.r * 2]);
  return svg.node();
}

d3.select("#keywords .keywords_container").append(function (this: any) {
  return drawCircle(this.clientWidth, this.clientHeight);
});

export function updateCircle() {
  d3.select("#keywords .keywords_container").selectAll("*").remove();
  d3.select("#keywords .keywords_container").append(function (this: any) {
    return drawCircle(this.clientWidth, this.clientHeight);
  });
}
