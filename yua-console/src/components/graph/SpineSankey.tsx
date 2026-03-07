"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  sankey,
  sankeyLinkHorizontal,
  SankeyNodeMinimal,
  SankeyLinkMinimal,
} from "d3-sankey";

type StageFlow = {
  stage: string;
  next: string;
  weight?: number;
};

type Props = {
  stages: string[];
  flows: StageFlow[];
};

type SpineNode = SankeyNodeMinimal & {
  name: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

type SpineLink = SankeyLinkMinimal & {
  width: number;
};

export default function SpineSankey({ stages, flows }: Props) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = 750;
    const height = Math.max(400, stages.length * 55);

    const nodes: SpineNode[] = stages.map((s, i) => ({
      name: s,
      index: i,
      x0: 0,
      x1: 0,
      y0: 0,
      y1: 0,
    }));

    const links: SpineLink[] = flows.map((f) => ({
      source: stages.indexOf(f.stage),
      target: stages.indexOf(f.next),
      value: f.weight ?? 1,
      width: 0,
    }));

    // 🔥 제네릭으로 결과 타입 제한
    const sankeyGen = sankey<SpineNode, SpineLink>()
      .nodeWidth(20)
      .nodePadding(24)
      .extent([
        [0, 0],
        [width, height],
      ]);

    const { nodes: sankeyNodes, links: sankeyLinks } = sankeyGen({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((l) => ({ ...l })),
    });

    // --- 🔥 Node Rectangles (여기서 타입을 명시해야 함)
    const node = svg
      .append("g")
      .selectAll<SVGRectElement, SpineNode>("rect")
      .data<SpineNode>(sankeyNodes)
      .enter()
      .append("rect")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("height", (d) => Math.max(d.y1 - d.y0, 5))
      .attr("width", 16)
      .attr("rx", 6)
      .attr("fill", "rgba(0,0,0,0.65)")
      .attr("stroke", "white")
      .attr("stroke-width", 0.6);

    node.append("title").text((d) => d.name);

    // --- 🔥 Node Labels (여기도 타입 명시)
    svg
      .append("g")
      .selectAll<SVGTextElement, SpineNode>("text")
      .data<SpineNode>(sankeyNodes)
      .enter()
      .append("text")
      .attr("x", (d) => d.x0 - 8)
      .attr("y", (d) => (d.y0 + d.y1) / 2)
      .attr("text-anchor", "end")
      .attr("alignment-baseline", "middle")
      .attr("font-size", 12)
      .attr("fill", "#0f172a")
      .text((d) => d.name);

    // --- 🔥 Links도 명시
    svg
      .append("g")
      .selectAll<SVGPathElement, SpineLink>("path")
      .data<SpineLink>(sankeyLinks)
      .enter()
      .append("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", "rgba(0,0,0,0.15)")
      .attr("stroke-width", (d) => Math.max(1, d.width))
      .attr("opacity", 0.9);

  }, [stages, flows]);

  return (
    <div className="glass p-4 rounded-xl border border-black/10 shadow-lg">
      <h2 className="text-lg font-semibold mb-3">Sankey Flow — Spine Pipeline</h2>
      <svg ref={ref} width={760} height={500}></svg>
    </div>
  );
}
