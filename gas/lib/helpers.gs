/**
 * lib/helpers.gs — handler 共通ヘルパー。
 *
 * 雛形段階では tmLintTodoFinding_ を全ハンドラから共通参照させる。
 * 本実装が進み、各ハンドラが具体的な Finding を返すようになったら本ヘルパーは縮退・削除可能。
 *
 * loader.gs の TM_LINT_CONFIG.files 配列で handler より先に読み込まれる前提（this.xxx 形式でグローバルに展開）。
 */

this.tmLintTodoFinding_ = function(rule, implementationNote) {
  return {
    ruleId: rule.id,
    severity: 'INFO',
    guidelineRef: rule.guideline_ref || '',
    location: { type: 'document', index: -1, hint: '未実装（雛形）' },
    snippet: '',
    message: rule.message || '',
    implementationNote: implementationNote || '',
    autoFixable: false
  };
};
