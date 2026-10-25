# 화석발굴 ASMR — 50종 콘텐츠 버전

공룡·암모나이트·광물·조개·식물·삼엽충 50종의 발굴 체험. 기존 짐싸줘와 독립된 React/TypeScript/Vite 앱이다. 토스 공식 create-ait-app으로 생성했고 `@apps-in-toss/web-framework` 3.8.1을 사용한다.

## 실행

Node 24 이상. 이 폴더에서 실행한다.

```powershell
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 5186
```

브라우저에서 `http://127.0.0.1:5186/`을 연다. 개발 화면에는 공식 AIT 도구 버튼이 표시될 수 있다. 배포용 화면을 보려면:

```powershell
npm.cmd run build:web
npm.cmd run preview -- --host 127.0.0.1 --port 5187
```

`http://127.0.0.1:5187/`에서 확인한다. 이 주소는 해당 PC에서 실행 중일 때만 열린다.

## 사용

- 홈에서 발굴 시작 → 암석 여러 곳을 두드린다. 같은 곳은 더 깊어지고 원거리 암석은 남는다.
- 망치/브러시를 선택한다. 90%에 도달하면 반드시 브러시로 바꾸어 남은 먼지를 골고루 털어야 한다.
- 그 이후에도 망치를 계속 사용해 100%에 도달하면 암석이 깨져 실패한다. 실패 회차는 도감에 등록되지 않으며 기존 기록은 보존된다.
- 키보드는 캔버스에 초점을 둔 뒤 방향키로 위치 이동, 스페이스/Enter로 타격한다.
- 브러시 마무리까지 성공하면 공개 연출과 도감 등록이 이루어진다. 도감은 50칸 카드 격자로, 미발견은 `???`로 표시한다. 발견한 카드에서 표본을 확대할 수 있다.
- 50종을 등급 확률 60/28/10/2%로 추첨하고 같은 등급 내부에서는 균등하게 선정한다. 카테고리/등급/발견 필터로 탐색한다. 종별 중복 횟수를 기록하고 기존 암모나이트 기록을 보존한다.
- 설정에서 사운드·볼륨·모션 감소·품질을 바꾼다. 발견 기록과 설정은 localStorage에 유지된다.
- 탭을 옮겨도 현재 발굴 손상은 유지되지만 새로고침/앱 종료 후 미완료 발굴은 초기화된다.

## 검증과 빌드

```powershell
npm.cmd test
npm.cmd run lint
node scripts/audit-specimens.mjs
npm.cmd run build
```

마지막 명령은 타입 검사·웹 빌드·공식 `ait build`를 실행해 `fossil-asmr-dev.ait`를 생성한다. `fossil-asmr-dev`는 로컬 개발 식별자다. 콘솔 등록 후 `$env:AIT_APP_NAME='실제콘솔ID'`를 지정하고 다시 빌드한다. 번들 내용을 수동 편집하지 않는다. 생성 성공과 콘솔 업로드/컴파일 성공은 별개다.

브라우저 검증은 5187 미리보기 실행 후 별도 QA 세션에서 실행한다. 첫 감사 스크립트는 **그 브라우저의 이 프로토타입 저장 기록을 초기화**하므로 평소 사용하는 브라우저 세션에 실행하지 않는다.

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=fossilqa open http://127.0.0.1:5187
npx.cmd --yes --package @playwright/cli playwright-cli -s=fossilqa run-code --filename scripts/browser-catalog-audit.js
npx.cmd --yes --package @playwright/cli playwright-cli -s=fossilqa run-code --filename scripts/browser-edge-audit.js
npx.cmd --yes --package @playwright/cli playwright-cli -s=fossilqa run-code --filename scripts/browser-contrast-audit.js
```

## 현재 한계

소리는 직접 합성한 임시 효과음이고 실제 녹음 ASMR은 없다. 표본은 생성형 시각 재구성이다. SDK 저장 계층, 실제 광고, 현금성 보상은 구현하지 않았다. iOS/Android 토스 WebView, 실제 청취, 장시간 성능, 콘솔 제출·심사는 미검증이다. 50종 감사 스크립트는 카탈로그 원본을 읽기 위해 개발 서버 5186도 실행 중이어야 한다. 과거 browser-audit/browser-finish-audit는 1종 버전의 보존된 검증 기록이며 현재는 catalog 감사로 대체한다.

설계와 증거는 상위 `harness/`에 있다. 에셋 출처: [asset-register](../harness/asset-register.json). 검증 결과: [full-catalog-50](../harness/evidence/full-catalog-50.md).
