import * as d3 from "d3";

d3.csv("../data/cuisine_table.csv").then(function (data) {
  const table = d3.select("#table-wrap");

  table
    .append("thead")
    .append("tr")
    .selectAll("th")
    .data(["Cuisine", "Total Number", "Authentic Number", "Authentic Ratio"])
    .join("th")
    .text(function (d) {
      return d;
    });

  const rows = table.append("tbody").selectAll("tr").data(data).join("tr");

  rows
    .selectAll("td")
    .data(function (d) {
      return [d.cuisine, d.total_count, d.authentic_count, d.authentic_ratio];
    })
    .join("td")
    .text(function (d) {
      return d;
    });
});
