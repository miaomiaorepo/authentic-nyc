import * as d3 from "d3"

import bigraph from "../data/bigraph.json"

type Node = {
  weight: number
  color: string
  links?: Record<string, number>
  name?: string
  centerRadian?: number
  cx?: number
  cy?: number
  radius?: number
}
type Edge = { source: string; target: string; weight: number }
type Graph = Record<string, Node>

function initializeNames(nodes: Graph) {
  for (const [name, node] of Object.entries(nodes)) {
    node.name = name
  }
  return nodes
}

function partitionNodes(nodes: Graph, k: number): [Node[], Node[]] {
  const sortedEntries = Object.entries(nodes)
    .sort((a, b) => b[1].weight - a[1].weight)
    .map(([_, node]) => node)

  const topKNodes = sortedEntries.slice(0, k)
  const restNodes = sortedEntries.slice(k)

  return [topKNodes, restNodes]
}

function highlight(hoveredElementName: string | null) {
  const disableHighlight = hoveredElementName === null
  if (disableHighlight) {
    d3.select("#bigraph").selectAll(`[data-highlight-on]`).attr("filter", "")
  } else {
    d3.select("#bigraph")
      .selectAll(`[data-highlight-on]`)
      .each(function () {
        const ul = d3.select(this)
        const highlightConditions = ul.attr("data-highlight-on").split("|")
        if (highlightConditions.includes(hoveredElementName!)) {
          ul.attr("filter", "url(#highlight)")
        } else {
          ul.attr("filter", "url(#lowlight)")
        }
      })
  }
}

function drawCircles(
  collection: string,
  nodes: Node[],
  radius: number,
  totalRadian: number,
  gapRatio: number,
  graph: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
  position: "left" | "right",
  circleMargin: number = 5,
  textSizeInPx: number = 18
) {
  const minWeight = nodes.reduce((acc, curr) => Math.min(acc, curr.weight), Infinity)
  const gapWeight = minWeight * gapRatio
  const positions: number[] = []
  let startPosition = -gapWeight
  nodes.forEach(node => {
    startPosition += gapWeight + node.weight
    positions.push(startPosition)
    startPosition += node.weight
  })

  const radianScale = d3.scaleLinear().domain([0, startPosition]).range([0, totalRadian])

  const startRadian = (Math.PI - totalRadian) / 2

  positions.forEach((p, i) => {
    const centerRadian = (radianScale(p) + startRadian) * (position === "left" ? -1 : 1) - Math.PI / 2
    const node = nodes[i]
    node.centerRadian = centerRadian
    node.cx = radius * Math.cos(centerRadian)
    node.cy = radius * Math.sin(centerRadian)
    node.radius = radius * Math.abs(Math.sin(radianScale(nodes[i].weight)))
  })

  const group = graph
    .selectAll(`.${collection}-group`)
    .data(nodes)
    .enter()
    .append("g")
    .attr("transform", node => `translate(${node.cx},${node.cy})`)

  group
    .append("circle")
    .attr("class", "node")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", node => node.radius!)
    .attr("fill", node => node.color)
    .attr("stroke", "none")
    .attr("data-highlight-on", node => [node.name!, ...Object.keys(node.links!)].join("|"))
    .on("mouseover", function ({ target }) {
      // @ts-ignore
      highlight(d3.select(target).data()[0].name)
    })
    .on("mouseout", function () {
      // @ts-ignore
      highlight(null)
    })

  group
    .append("text")
    .attr("class", "node")
    .attr("x", node => (position === "left" ? -node.radius! - circleMargin : node.radius! + circleMargin))
    .attr("dy", `${textSizeInPx / 2}`)
    .attr("style", `text-anchor: ${position === "left" ? "end" : "start"}; font-size: ${textSizeInPx}px;`)
    .attr("fill", node => d3.interpolateRgb(node.color, "black")(0.2))
    .attr("transform", node => `rotate(${(node.centerRadian! / Math.PI) * 180 - (position === "left" ? 180 : 0)})`)
    .attr("data-highlight-on", node => [node.name!, ...Object.keys(node.links!)].join("|"))
    .text(node => node.name!)
    .on("mouseover", function ({ target }) {
      // @ts-ignore
      highlight(d3.select(target).data()[0].name)
    })
    .on("mouseout", function () {
      highlight(null)
    })
}

function drawHiddenNodes(
  nodes: Node[],
  radius: number,
  width: number,
  height: number,
  backgroundColor: string,
  totalRadian: number,
  defs: d3.Selection<SVGDefsElement, unknown, HTMLElement, any>,
  graph: d3.Selection<SVGGElement, unknown, HTMLElement, any>
) {
  // create a gradient for the background
  const backgroundGradientId = "background-gradient"

  const backgroundGradient = defs
    .append("linearGradient")
    .attr("id", backgroundGradientId)
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%")

  const stops = [
    { offset: "0%", opacity: "0" },
    { offset: "8.1%", opacity: "0.013" },
    { offset: "15.5%", opacity: "0.049" },
    { offset: "22.5%", opacity: "0.104" },
    { offset: "29%", opacity: "0.175" },
    { offset: "35.3%", opacity: "0.259" },
    { offset: "41.2%", opacity: "0.352" },
    { offset: "47.1%", opacity: "0.45" },
    { offset: "52.9%", opacity: "0.55" },
    { offset: "58.8%", opacity: "0.648" },
    { offset: "64.7%", opacity: "0.741" },
    { offset: "71%", opacity: "0.852" },
    { offset: "77.5%", opacity: "0.896" },
    { offset: "84.5%", opacity: "0.951" },
    { offset: "91.9%", opacity: "0.987" },
    { offset: "100%", opacity: "1" },
  ]

  backgroundGradient
    .selectAll("stop")
    .data(stops)
    .enter()
    .append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-opacity", d => d.opacity)
    .attr("stop-color", backgroundColor)

  // draw the foreground rectangle
  const x = -width / 2
  const y = radius * (totalRadian / 2)
  graph
    .append("rect")
    .attr("x", x)
    .attr("y", y)
    .attr("width", width)
    .attr("height", height)
    .attr("style", `fill: url("#${backgroundGradientId}");`)

  const nodePositionScale = d3
    .scaleLinear()
    .domain([0, nodes.length - 1])
    .range([0, width])

  nodes.forEach((node, i) => {
    node.cx = x + nodePositionScale(i)
    node.cy = y + height
    node.radius = 0
  })
}

function drawLinks(
  edges: Edge[],
  nodes: Graph,
  radius: number,
  graph: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
  circleMargin = 5,
  minStrokeWidth = 1,
  maxStrokeWidth = 5
) {
  // get the min weight and max weight of the edges
  const minWeight = edges.reduce((acc, curr) => Math.min(acc, curr.weight), Infinity)
  const maxWeight = edges.reduce((acc, curr) => Math.max(acc, curr.weight), -Infinity)

  const strokeScale = d3.scaleLinear().domain([minWeight, maxWeight]).range([minStrokeWidth, maxStrokeWidth])

  for (let edge of edges) {
    const source = nodes[edge.source]
    const target = nodes[edge.target]
    if (source.cx && source.cy && target.cx && target.cy) {
      const context = d3.path()
      context.moveTo(
        ((radius - source.radius! - circleMargin) * source.cx!) / radius,
        ((radius - source.radius! - circleMargin) * source.cy!) / radius
      )
      context.bezierCurveTo(
        0.55 * source.cx!,
        0.55 * source.cy!,
        0.55 * target.cx!,
        0.55 * target.cy!,
        ((radius - target.radius! - circleMargin) * target.cx!) / radius,
        ((radius - target.radius! - circleMargin) * target.cy!) / radius
      )
      graph
        .append("path")
        .attr("d", context.toString())
        .attr("fill", "none")
        .attr("stroke", d3.interpolateRgb(source.color, target.color)(0.5))
        .attr("stroke-width", strokeScale(edge.weight))
        .attr("data-highlight-on", `${source.name}|${target.name}`)
    }
  }
}

function normalizeLinks(nodes: Graph) {
  // get pair of keys for all nodes
  for (let [name, node] of Object.entries(nodes)) {
    node.links = node.links || {}
    for (let [linkTo, edge] of Object.entries(node.links)) {
      const otherNode = nodes[linkTo]
      if (otherNode) {
        otherNode.links = otherNode.links || {}
        otherNode.links[name] = edge
      }
    }
  }
}

function drawBipartiteGraph(
  width: number,
  height: number,
  radius: number,
  radianRatio: number,
  topKCuisines: number,
  topKNeighborhoods: number
) {
  const DEBUG = false

  const allCuisines: Graph = initializeNames(bigraph.cuisines)
  const allNeighborhoods: Graph = initializeNames(bigraph.neighborhoods)
  normalizeLinks({ ...allCuisines, ...allNeighborhoods })

  const [topCuisines, otherCuisines] = partitionNodes(allCuisines, topKCuisines)
  const [topNeighborhoods, otherNeighborhoods] = partitionNodes(allNeighborhoods, topKNeighborhoods)

  const edges: Edge[] = []
  for (const nodes of [allCuisines, allNeighborhoods]) {
    for (const [linkedFrom, details] of Object.entries(nodes)) {
      if (details.links) {
        for (const [linkedTo, linkWeight] of Object.entries(details.links)) {
          edges.push({
            source: linkedFrom,
            target: linkedTo,
            weight: linkWeight,
          })
        }
      }
    }
  }

  const backgroundColor = d3.select("#bigraph").style("background-color")

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)

  const defs = svg.append("defs")

  defs
    .append("filter")
    .attr("id", "highlight")
    .append("feColorMatrix")
    .attr("in", "SourceGraphic")
    .attr("type", "matrix")
    .attr(
      "values",
      `0.5 0   0   0 0
       0   0.5 0   0 0
       0   0   0.5 0 0
       0   0   0   1 0`
    )
  const lowlightFilter = defs.append("filter").attr("id", "lowlight")

  lowlightFilter
    .append("feColorMatrix")
    .attr("in", "SourceGraphic")
    .attr("type", "matrix")
    .attr(
      "values",
      `1 0 0 0   0
       0 1 0 0   0
       0 0 1 0   0
       0 0 0 0.2 0`
    )

  const g = svg.append("g")

  const graph = g.append("g")
  graph
    .append("circle")
    .attr("r", radius)
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-opacity", DEBUG ? 1 : 0)
  const circleMargin = radius * 0.01
  const gapRatio = 1
  const totalRadian = radianRatio * Math.PI

  drawCircles(
    "top-cuisine",
    topCuisines,
    radius,
    totalRadian,
    gapRatio,
    // @ts-ignore
    graph,
    "left",
    circleMargin
  )

  drawCircles(
    "top-neighborhood",
    topNeighborhoods,
    radius,
    totalRadian,
    gapRatio,
    // @ts-ignore
    graph,
    "right",
    circleMargin
  )

  const hiddenNodes = otherCuisines.concat(otherNeighborhoods.reverse())
  drawHiddenNodes(
    hiddenNodes,
    radius,
    radius,
    radius * 0.2,
    backgroundColor,
    totalRadian,
    // @ts-ignore
    defs,
    g
  )

  drawLinks(
    edges,
    { ...allCuisines, ...allNeighborhoods },
    radius,
    // @ts-ignore
    graph,
    circleMargin
  )
  highlight(null)
  return svg.node()
}

const RADIAL_RATIO = 1.2
const TOP_K_CUISINES = 10
const TOP_K_NEIGHBORHOODS = 10
const RADIAN_RATIO = 0.4
d3.select("#bigraph").append(function (this: any) {
  const radius = (Math.min(this.clientWidth, this.clientHeight) / 2) * RADIAL_RATIO
  return drawBipartiteGraph(
    this.clientWidth,
    this.clientHeight,
    radius,
    RADIAN_RATIO,
    TOP_K_CUISINES,
    TOP_K_NEIGHBORHOODS
  )
})

export function updateBigraph() {
  d3.select("#bigraph").selectAll("*").remove()
  d3.select("#bigraph").append(function (this: any) {
    const radius = (Math.min(this.clientWidth, this.clientHeight) / 2) * RADIAL_RATIO
    return drawBipartiteGraph(
      this.clientWidth,
      this.clientHeight,
      radius,
      RADIAN_RATIO,
      TOP_K_CUISINES,
      TOP_K_NEIGHBORHOODS
    )
  })
}
