import DeepDiff from "deep-diff"
/**
 * Deep diff between two object, using lodash
 */
export function diff(object: any, base: any) {
	return DeepDiff.diff(object, base);
}