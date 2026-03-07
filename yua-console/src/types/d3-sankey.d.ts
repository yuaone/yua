declare module "d3-sankey" {
  export interface SankeyNodeMinimal {
    index?: number;
    x0?: number;
    x1?: number;
    y0?: number;
    y1?: number;
    name?: string;
  }

  export interface SankeyLinkMinimal {
    index?: number;
    source: number | SankeyNodeMinimal;
    target: number | SankeyNodeMinimal;
    value?: number;
  }

  export function sankey<Node extends SankeyNodeMinimal, Link extends SankeyLinkMinimal>(): any;

  export function sankeyLinkHorizontal(): (d: any) => string;
}
