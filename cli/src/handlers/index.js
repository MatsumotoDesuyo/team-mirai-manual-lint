// Layer B ハンドラのレジストリ。本実装したものだけここに登録する。
// 未登録のルールは runner.js が「CLI ハンドラ未実装」として INFO Finding を出す。

import {
  // B-TEXT 文章スタイル・文法系
  checkSentenceTopic,
  checkSentenceLength,
  checkMissingParticle,
  checkRanukiKotoba,
  checkGaConsecutive,
  checkModifierProximity,
  checkVerboseExpression,
  checkPassiveVoice,
  checkDoubleNegation,
  checkAmbiguousAdverb,
  // B-TEXT 読みやすさ・構成系
  checkTypo,
  checkReadability,
  checkPreferBullets,
  checkSolutionOriented,
  checkFigureCaption,
  // B-TONE 系
  checkValuesAlignment,
  checkToneBalance,
  checkReaderPerspective,
  // B-EMPHASIS / B-STRUCT
  checkEmphasisAsText,
  checkChapterStructure,
} from './text.js';

export const handlers = {
  // B-TEXT
  checkSentenceTopic,
  checkSentenceLength,
  checkMissingParticle,
  checkRanukiKotoba,
  checkGaConsecutive,
  checkModifierProximity,
  checkVerboseExpression,
  checkPassiveVoice,
  checkDoubleNegation,
  checkAmbiguousAdverb,
  checkTypo,
  checkReadability,
  checkPreferBullets,
  checkSolutionOriented,
  checkFigureCaption,
  // B-TONE
  checkValuesAlignment,
  checkToneBalance,
  checkReaderPerspective,
  // B-EMPHASIS / B-STRUCT
  checkEmphasisAsText,
  checkChapterStructure,

  // 残り未実装（用語集スプレッドシート連携が必要）:
  //   - B-TEXT-001  です・ます調統一
  //   - B-TEXT-002  英数字半角統一
  //   - B-TEXT-003  用語統一
};
