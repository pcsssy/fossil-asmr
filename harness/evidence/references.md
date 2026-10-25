# 확인한 공식 자료 — 2026-10-24

- [토스 공식 하네스](https://github.com/toss/apps-in-toss-harness)와 설치된 ait 0.2.6의 manifest: 도구·스킬 구성 확인.
- `npx.cmd --yes create-ait-app@latest --help`의 실제 출력: directory, `--inline`, `--pm npm`, `--template react-ts` 옵션 확인 후 별도 app 폴더에 생성.
- 생성 도구 산출물: web-framework 3.8.1, devtools 3.8.1, React 19.3.1, Vite 8.3.5, TypeScript 6.0.3이 lockfile에 기록됨. 버전은 부모 앱에서 복사하지 않았다.
- [Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices): 사용자 제스처 활성화, 사운드 제어 및 샘플 버퍼 접근을 확인했다.

웹 문서의 SDK 튜토리얼 한 페이지는 조회에 실패했다. 현재 SDK 통합/설정/빌드는 공식 생성 도구의 실제 출력과 설치된 타입 및 CLI 결과로 검증했으며, 문서 조회 실패를 성공으로 기록하지 않았다.
