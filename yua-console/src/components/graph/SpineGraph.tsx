"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

type GraphNode = {
  id: string;
  group?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

type GraphLink = {
  source: string;
  target: string;
};

type Props = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export default function SpineGraph({ nodes, links }: Props) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = 760;
    const height = 540;

    // --- Force Simulation ---
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, any>(links)
          .id((d) => d.id)
          .distance(80)
      )
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // --- Links ---
    const link = svg
      .append("g")
      .attr("stroke", "rgba(0,0,0,0.25)")
      .attr("stroke-width", 1.6)
      .selectAll("line")
      .data(links)
      .enter()
      .append("line");

    // --- Nodes ---
    const node = svg
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 16)
      .attr("fill", "rgba(0,0,0,0.7)")
      .style("cursor", "grab")
      .call(
        d3
          .drag<SVGCircleElement, GraphNode>()
          .on(
            "start",
            (
              event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>,
              d
            ) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x ?? 0;
              d.fy = d.y ?? 0;
            }
          )
          .on(
            "drag",
            (
              event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>,
              d
            ) => {
              d.fx = event.x;
              d.fy = event.y;
            }
          )
          .on(
            "end",
            (
              event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>,
              d
            ) => {
              if (!event.active) simulation.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            }
          )
      );

    // --- Labels ---
    const labels = svg
      .append("g")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d) => d.id)
      .attr("font-size", 11)
      .attr("fill", "#0f172a")
      .attr("text-anchor", "middle")
      .attr("dy", 32);

    // --- Tick Handler ---
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
      labels.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);
    });
  }, [nodes, links]);

  return (
    <div className="glass p-4 rounded-xl border border-black/10 shadow-lg">
      <h2 className="text-lg font-semibold mb-3">Spine DAG Graph</h2>
      <svg ref={ref} width={760} height={560}></svg>
    </div>
  );
}
