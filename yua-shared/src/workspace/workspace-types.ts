import { ID, Tier } from "../types/common";

export type Workspace = {
  id: ID;
  name: string;
  plan: Tier;
};
