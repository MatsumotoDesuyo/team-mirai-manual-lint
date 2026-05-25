// Layer B ハンドラのレジストリ。本実装したものだけここに登録する。
// 未登録のルールは runner.js が「CLI ハンドラ未実装」として INFO Finding を出す。

import {
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
} from './text.js';

export const handlers = {
  // B-TEXT-006 1文1トピック
  checkSentenceTopic,
  // B-TEXT-007 1文長 50字推奨・100字最大
  checkSentenceLength,
  // B-TEXT-009 格助詞省略しない
  checkMissingParticle,
  // B-TEXT-010 ら抜き言葉禁止
  checkRanukiKotoba,
  // B-TEXT-011 「が」連続使用回避
  checkGaConsecutive,
  // B-TEXT-012 修飾被修飾の近接
  checkModifierProximity,
  // B-TEXT-013 冗長表現
  checkVerboseExpression,
  // B-TEXT-014 受動態回避
  checkPassiveVoice,
  // B-TEXT-015 二重否定禁止
  checkDoubleNegation,
  // B-TEXT-016 曖昧副詞回避
  checkAmbiguousAdverb,

  // 以下、未実装（雛形）。順次実装予定:
  //   - B-TEXT-001  です・ます調統一  ※用語集スプレッドシート連携が必要
  //   - B-TEXT-002  英数字半角統一    ※同上
  //   - B-TEXT-003  用語統一          ※同上
  //   - B-TEXT-004  誤字脱字
  //   - B-TEXT-005  読みにくさ・わかりにくさ
  //   - B-TEXT-008  長文回避・箇条書き推奨
  //   - B-TEXT-017  解決志向メッセージ
  //   - B-TEXT-018  図表補足説明
  //   - B-TONE-001  価値観の踏襲
  //   - B-TONE-002  文章のトーン
  //   - B-TONE-003  読み手視点
  //   - B-EMPHASIS-001  強調は文章で表現
  //   - B-STRUCT-001  前編後編・章立て構成
};
