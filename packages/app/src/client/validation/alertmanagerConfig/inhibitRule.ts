import * as yup from "yup";

import { labelName } from "./common";

export const emailConfig = yup.object({
  target_match: yup.object().meta({
    comment: "Matchers that have to be fulfilled in the alerts to be muted.",
    example: "<labelname>: <labelvalue>"
  }),
  target_match_re: yup.object().meta({
    comment:
      "Regex matchers that have to be fulfilled in the alerts to be muted.",
    example: "<labelname>: <regex>"
  }),
  source_match: yup.object().meta({
    comment:
      "Matchers for which one or more alerts have to exist for the inhibition to take effect.",
    example: "<labelname>: <labelvalue>"
  }),
  source_match_re: yup.object().meta({
    comment:
      "Regex matchers for which one or more alerts have to exist for the inhibition to take effect.",
    example: "<labelname>: <regex>"
  }),
  equal: yup.array().of(labelName).meta({
    comment:
      "Labels that must have an equal value in the source and target alert for the inhibition to take effect."
  })
});
