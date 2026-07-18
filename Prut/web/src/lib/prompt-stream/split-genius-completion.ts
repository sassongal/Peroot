/**
 * @deprecated Moved to `./trailer`. This thin shim re-exports the two original
 * function names so existing importers keep working. New code should import
 * `stripTrailerForDisplay` / `parseTrailer` / `TRAILER` from `./trailer`.
 */
export {
  splitCompletionAndQuestions,
  stripGeniusQuestionsForDisplay,
} from "./trailer";
