# 도구와 연결 상태

확인일: 2026-10-24 (Asia/Seoul).

## 설치 완료

| 항목 | 설치 위치/상태 | 용도 |
| --- | --- | --- |
| 토스 공식 ait 0.2.6 | 사용자 Codex 플러그인, installed/enabled 확인 | 기획·생성·디자인·UX 문구·개발·검증·출시 절차 |
| Playwright | 프로젝트 `.agents/skills/playwright/` | 브라우저 조작, 실행 화면 증거 |
| Figma | 프로젝트 `.agents/skills/figma/` | 실제 Figma 프레임이 있을 때 디자인 정보 추출 |
| fossil-experience | 프로젝트 `.agents/skills/fossil-experience/` | 이 프로젝트의 재질·지역 손상·사운드 품질 기준 |

공식 ait 스킬 12종: welcome, plan, new-miniapp, feature, design, ux-writing, inject, debug, setup-debugger, test-on-device, server, launch.

설치 명령은 `codex.cmd plugin marketplace add toss/apps-in-toss-harness --json`, `codex.cmd plugin add ait@apps-in-toss --json`을 사용했다. 공식 OpenAI skill-installer로 openai/skills의 playwright와 figma를 설치했다. 전역 보안 모드/모델/승인 설정은 바꾸지 않았다.

## MCP 확인

- `apps-in-toss-docs`: enabled, 공식 문서 URL 등록. auth_status=unsupported는 무인증 서버 상태이며 인증 실패라는 의미로 판정하지 않는다. 이 대화에서는 웹으로 공식 자료를 조회했고 MCP 도구 호출 자체는 아직 미검증이다.
- 기존 `apps-in-toss-console`: enabled, auth_status=o_auth 확인. 인증 기록이 있다는 의미이며 실제 조회 성공까지 확인한 것은 아니다.
- 새 플러그인 `ait-console`: enabled, auth_status=not_logged_in. 이 별칭을 쓰려면 사용자 브라우저 OAuth가 필요하다. 기존 서버를 삭제하거나 중복 재등록하지 않았다.
- Figma 앱: 2026-10-24 재조회에서 installed=true, status=ENABLED 확인. 설치 완료. 현재 대화에는 Figma API 도구가 아직 노출되지 않아 계정 인증과 실제 파일 접근 성공은 미검증이다. 새 세션에서 도구 노출과 파일 조회를 확인한다.

새 스킬은 다음 턴부터 사용할 수 있다. 새 플러그인의 도구가 보이지 않으면 Codex 세션을 다시 연다. 플러그인 콘솔 별칭이 필요할 때 `codex.cmd mcp login ait-console`으로 인증한다. 토큰을 채팅이나 문서에 붙여넣지 않는다.

## 현재 환경의 주의점

Node v24.22.0, Codex CLI 0.163.0을 확인했다. PowerShell 실행 정책으로 `codex.ps1`이 차단되므로 `codex.cmd`, `npm.cmd`, `npx.cmd`를 사용한다. 실행 정책은 변경하지 않는다.

샌드박스에서 `codex ... list`는 빈 목록을 반환했지만 실제 사용자 권한으로 조회하면 설치/인증 상태가 확인됐다. 빈 목록만으로 설치 실패 또는 설정 삭제를 결정하지 않는다. 조회 시 토큰/전체 환경변수는 출력하지 않는다.

같은 샌드박스에서 `py -3`은 Python이 없다고 응답했으나 사용자 환경에서는 설치·검증 스크립트가 정상 실행됐다. 하네스 점검이 이 오류로 막히면 사용자 Python 접근 권한을 요청하고 재실행한다.

## 공식 근거

- [토스 공식 하네스](https://github.com/toss/apps-in-toss-harness): 플러그인 설치와 MCP 구성.
- [토스 AI 개발 안내](https://developers-apps-in-toss.toss.im/ai-vibe-coding/intro.md): 공식 플러그인과 개발 흐름.
- [토스 콘솔 MCP](https://developers-apps-in-toss.toss.im/guide/console-mcp.md): OAuth와 콘솔 작업.
- [OpenAI 공식 스킬 문서](https://learn.chatgpt.com/docs/build-skills): 저장소 `.agents/skills` 탐색.

정책·SDK·CLI가 바뀔 수 있으므로 실제 구현과 출시 시점에 다시 확인한다. 초기 도구 세팅은 콘솔 등록·번들 업로드·심사 신청·출시를 수행하지 않았다.
