import { adsenseReport } from "../../services/adsense.js";
import { wrap } from "../../shared/utils.js";

export const getAdsenseReport = wrap(async (req, res) => {
  res.json(await adsenseReport(req.query.range as string | undefined));
});
