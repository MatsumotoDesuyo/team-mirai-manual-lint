// OAuth フロー実行: credentials.json を読み込み、ブラウザでログイン → token.json を保存。
// 初回セットアップ時に `npm run auth` で 1 回実行する。

import 'dotenv/config';
import { authenticate } from '@google-cloud/local-auth';
import fs from 'node:fs/promises';
import path from 'node:path';

const SCOPES = ['https://www.googleapis.com/auth/documents.readonly'];

const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';
const tokenPath = process.env.GOOGLE_TOKEN_PATH || './token.json';

async function main() {
  await fs.access(credentialsPath).catch(() => {
    throw new Error(
      `credentials.json が見つかりません: ${credentialsPath}\n` +
      'Google Cloud Console で OAuth 2.0 Client ID (Desktop app) を作成し、' +
      'ダウンロードした JSON をこのパスに配置してください。'
    );
  });

  console.error('OAuth フローを開始します（ブラウザが開きます）...');
  const client = await authenticate({
    scopes: SCOPES,
    keyfilePath: path.resolve(credentialsPath),
  });

  if (!client.credentials.refresh_token) {
    throw new Error(
      'refresh_token が取得できませんでした。Google Cloud Console で OAuth Client を ' +
      'Desktop app タイプで作成し直してください。'
    );
  }

  const keys = JSON.parse(await fs.readFile(credentialsPath, 'utf-8'));
  const key = keys.installed || keys.web;
  const token = {
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  };

  await fs.writeFile(tokenPath, JSON.stringify(token, null, 2));
  console.error(`認証成功。トークンを ${tokenPath} に保存しました。`);
}

main().catch(err => {
  console.error('認証失敗:', err.message);
  process.exit(1);
});
