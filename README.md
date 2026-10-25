# 화석발굴 ASMR — 50종 콘텐츠 버전

독립 폴더 `앱인토스\화석발굴-ASMR`의 화석발굴 프로젝트다. VS Code에서 이 폴더를 열고, 앱 실행은 `app/`에서 진행한다. `app/`에 6개 분류 50종의 지역 파괴·파편·먼지·합성 사운드·수집 도감을 구현한다. 현재 실행 미리보기는 [http://127.0.0.1:5187/](http://127.0.0.1:5187/)이며 로컬 서버가 켜져 있을 때 접근할 수 있다. 최신 완료 범위와 검증은 [상태 기록](harness/status.md)을 기준으로 한다.

도감은 `???` 미발견 카드가 있는 50칸 격자다. 발견한 종만 고유 이미지·이름·등급·횟수가 열리며 분류/등급/발견 필터로 탐색한다. 발굴은 90%부터 브러시로 마무리해야 하며, 망치를 계속 써 100%가 되면 파손 실패한다.

- 실행·검증 명령: [app/README.md](app/README.md)
- 50종 구현·검증 결과: [harness/evidence/full-catalog-50.md](harness/evidence/full-catalog-50.md)
- 에셋과 생성 프롬프트: [harness/evidence/asset-prompts.md](harness/evidence/asset-prompts.md)

- 에이전트 진입: [AGENTS.md](AGENTS.md)
- 진행 상황: [harness/status.md](harness/status.md)
- 디자인 기준: [harness/design-direction.md](harness/design-direction.md)
- 연결 상태와 설치 내역: [harness/tooling.md](harness/tooling.md)
- 다음 작업 프롬프트: [harness/next-task.md](harness/next-task.md)

```powershell
py -3 scripts/check_harness.py
py -3 scripts/check_harness.py --strict-catalog
```

엄격 검증은 정규화 카탈로그의 50종 ID·등급·배포 이미지까지 검사한다. 원본의 등급/카테고리 불일치 정정 이유는 D007 결정에 기록한다. 이미지별 전체 생성 프롬프트와 원본 경로는 `harness/evidence/specimen-generation.json`에 보존한다.
