// Google Docs API でドキュメントを取得し、段落・Run 構造に整形する。

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

export async function fetchDoc(docId) {
  const auth = await authorize();
  const docs = google.docs({ version: 'v1', auth });
  const res = await docs.documents.get({ documentId: docId });
  return res.data;
}

/**
 * Doc リソースを Layer B が扱いやすい形に展開する。
 * - paragraphs: 段落配列 [{ index, text, headingType, isList }]
 *   - Layer A の docwalk と互換のあるフィールド名を保つ
 * - docText: 「[N] テキスト」形式の連結テキスト（LLM プロンプト用）
 */
export function extractParagraphs(doc) {
  const body = doc.body?.content || [];
  const paragraphs = [];
  let bodyIndex = 0;
  for (const elt of body) {
    if (!elt.paragraph) {
      bodyIndex++;
      continue;
    }
    const text = (elt.paragraph.elements || [])
      .map(e => e.textRun?.content || '')
      .join('')
      .replace(/\n$/, '');
    paragraphs.push({
      index: bodyIndex,
      text,
      headingType: elt.paragraph.paragraphStyle?.namedStyleType || 'NORMAL_TEXT',
      isList: !!elt.paragraph.bullet,
    });
    bodyIndex++;
  }
  return paragraphs;
}

export function formatDocForPrompt(paragraphs) {
  return paragraphs
    .map((p, i) => `[${i}] ${p.text}`)
    .join('\n');
}
