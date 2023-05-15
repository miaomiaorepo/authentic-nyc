import * as d3 from "d3";

import "normalize.css";
import "./css/styles.css";
import "./css/flip-card.css";

import "./scripts/map";
import "./scripts/table";
import "./scripts/bigraph";
import { updateCard } from "./scripts/card";
import { updateCircle } from "./scripts/circle";

d3.select(window).on("resize", () => (updateCard(), updateCircle()));
