// 校正用ルール・用語集スプレッドシートを Google Sheets API で取得する。
// 取得結果は { sheetTitle: [[row1cells...], [row2cells...], ...] } 形式で返す。
// runner.js から 1 回だけ呼び、用語集を必要とする全ハンドラに渡す。

import { google } from 'googleapis';
import fs from 'node:fs/promises';
import path from 'node:path';

const tokenPath = process.env.GOOGLE_TOKEN_PATH || './token.json';
const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';

async function authorize() {
  let token;
  try {
    token = JSON.parse(await fs.readFile(path.resolve(tokenPath), 'utf-8'));
  } catch (e) {
    throw new Error(
      `OAuth トークンが見つかりません: ${tokenPath}\n` +
      '初回セットアップでは `npm run auth` を先に実行してください。'
    );
  }
  const keys = JSON.parse(await fs.readFile(path.resolve(credentialsPath), 'utf-8'));
  const key = keys.installed || keys.web;
  const client = new google.auth.OAuth2(key.client_id, key.client_secret, key.redirect_uris[0]);
  client.setCredentials({ refresh_token: token.refresh_token });
  return client;
}

/**
 * スプレッドシートの全シートを 2 次元配列で取得。
 * @param {string} sheetId
 * @returns {Promise<{ title: string, values: string[][] }[]>}
 */
export async function fetchGlossary(sheetId) {
  const auth = await authorize();
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: 'sheets(properties(title,sheetId))' });
  const sheetTitles = (meta.data.sheets || []).map(s => s.properties.title);

  const out = [];
  for (const title of sheetTitles) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'${title}'`,
      });
      out.push({ title, values: res.data.values || [] });
    } catch (e) {
      // 個別シートの取得失敗は警告に留めて続行
      process.stderr.write(`[warn] シート「${title}」取得失敗: ${e.message}\n`);
    }
  }
  return out;
}

/**
 * 用語集データを LLM プロンプトに展開しやすい Markdown 形式に整形。
 * 大規模シートでもトークン数を抑えるよう、空行・余計な空白は除去。
 */
export function formatGlossaryForPrompt(glossary, maxRowsPerSheet = 200) {
  const lines = [];
  lines.push('# 校正用ルール・用語集（スプレッドシートから自動取得）');
  for (const sheet of glossary) {
    if (!sheet.values || sheet.values.length === 0) continue;
    lines.push('');
    lines.push(`## シート: ${sheet.title}`);
    const rows = sheet.values.slice(0, maxRowsPerSheet);
    for (const row of rows) {
      if (!row || row.every(c => !c || !c.trim())) continue;
      lines.push('- ' + row.map(c => (c == null ? '' : String(c).trim())).join(' | '));
    }
    if (sheet.values.length > maxRowsPerSheet) {
      lines.push(`- … (残り ${sheet.values.length - maxRowsPerSheet} 行は省略)`);
    }
  }
  return lines.join('\n');
}
