import * as d3 from "d3";

import cards from "../data/cards.json";

import { Packer } from "./packer";

type Card = {
  name: string;
  size: number;
  front: string;
  back: string;
  top?: number;
  left?: number;
};

function drawCard(width: number, height: number, gap: number = 20) {
  const sortedCards: Card[] = Array.from(
    Object.values(cards).sort((a, b) => a.size - b.size)
  );

  const circles = Array.from(sortedCards.map((card) => card.size / 2 + gap));
  const packer = new Packer(circles, width / height);
  const packedCircles = Array.from(packer.list.sort((a, b) => a.r - b.r));
  sortedCards.forEach((card, i) => {
    card.left = packedCircles[i].c.x - card.size / 2;
    card.top = packedCircles[i].c.y - card.size / 2;
  });

  const [top, bottom, left, right] = [
    Math.min(...packedCircles.map((c) => c.c.y - c.r)),
    Math.max(...packedCircles.map((c) => c.c.y + c.r)),
    Math.min(...packedCircles.map((c) => c.c.x - c.r)),
    Math.max(...packedCircles.map((c) => c.c.x + c.r)),
  ];

  const actualWidth = right - left;
  const actualHeight = bottom - top;

  const xScale = width / actualWidth;
  const yScale = height / actualHeight;
  const scale = Math.min(xScale, yScale);

  const dx = Math.max(0, -left);
  const dy = Math.max(0, -top);

  sortedCards.forEach((card) => {
    card.left! = (dx + card.left!) * scale;
    card.top! = (dy + card.top!) * scale;
    card.size *= scale;
  });

  const cardContainer = d3.create("div");

  const cardInnerDiv = cardContainer
    .selectAll("div")
    .data(sortedCards)
    .enter()
    .append("div")
    .classed("flip-card", true)
    .style("top", (d) => d.top! + "px")
    .style("left", (d) => d.left! + "px")
    .style("width", (d) => d.size + "px")
    .style("height", (d) => d.size + "px")
    .append("div")
    .classed("flip-card-inner", true);

  cardInnerDiv
    .append("div")
    .classed("flip-card-front", true)
    .style("background-image", (d) => `url(${d.front})`);
  cardInnerDiv
    .append("div")
    .classed("flip-card-back", true)
    .style("background-image", (d) => `url(${d.back})`);
  return cardContainer.node();
}

d3.select("#cards .card_container").append(function (this: any) {
  return drawCard(this.clientWidth, this.clientHeight);
});

export function updateCard() {
  d3.select("#cards .card_container").selectAll("*").remove();
  d3.select("#cards .card_container").append(function (this: any) {
    return drawCard(this.clientWidth, this.clientHeight);
  });
}
