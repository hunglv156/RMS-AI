import data from "./jds.json";
import { jdSchema } from "../lib/validation";
export const samples = data.map((item) => ({
  ...item,
  jd: jdSchema.parse(item.jd),
}));
