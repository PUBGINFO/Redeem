# Mobile Coupon Redeemer — GitHub Pages + Cloudflare Worker

iPhone/iPad Safari에서 실행할 수 있도록 **GitHub Pages(프론트엔드) + Cloudflare Worker(백엔드 프록시)**로 분리한 배포용 구조입니다.

## 1. Cloudflare Worker 배포

Cloudflare 계정에서 Workers & Pages → Create → Worker를 만든 뒤 `worker/src/index.js` 내용을 배포하거나 Wrangler를 사용합니다.

Wrangler 사용:
```bash
cd worker
npx wrangler deploy
```

배포 후 `https://<name>.<subdomain>.workers.dev` 주소를 얻습니다.

## 2. GitHub Pages

이 저장소의 `docs/` 폴더를 GitHub Pages의 배포 소스로 선택합니다.

배포 전에 `docs/app.js`의:
```js
const API_BASE = "https://YOUR-WORKER.workers.dev";
```
를 실제 Cloudflare Worker 주소로 변경합니다.

GitHub Pages 설정:
Settings → Pages → Deploy from a branch → `main` / `/docs`

## 3. 모바일 사용

Safari에서 GitHub Pages 주소를 열면 됩니다. Node.js, Termux, Python, Colab을 iPhone/iPad에서 실행할 필요가 없습니다.

## 보안/개인정보

- 실제 쿠폰 URL, verifyKey, UID를 저장소에 넣지 않습니다.
- 데이터베이스를 사용하지 않습니다.
- Worker는 요청 값을 로그로 출력하지 않습니다.
- 페이지 로드만으로 외부 교환 요청을 보내지 않습니다.
- Start 버튼을 누른 후에만 요청합니다.
- 쿠폰 URL과 UID는 각각 최대 100개입니다.
- URL은 허용된 HTTPS upstream host/path만 받습니다.
- 성공은 upstream 응답에서 외부/내부 iRet가 성공으로 확인된 경우에만 표시합니다.
- 미확인 응답 코드는 임의로 성공 처리하지 않습니다.

## 동작 순서

쿠폰 1 → UID 1, UID 2, ... → 쿠폰 2 → UID 1, UID 2, ... 순으로 순차 처리합니다.
UID 사이에는 1초 대기하고, 전송 오류 / outer iRet 비정상 / inner iRet -10006에 대해 최대 3회 재시도합니다.

> Cloudflare Worker의 실행시간/스트리밍 제한은 계정 플랜 및 Cloudflare 정책에 따라 달라질 수 있습니다. 대량 요청에서는 Worker 실행 제한을 확인하세요.

## 테스트

`tests/worker.test.js`는 실제 upstream에 접속하지 않고 URL 파서와 응답 코드 매핑 fixture를 검사합니다.

```bash
node tests/worker.test.js
```
