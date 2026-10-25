# 생성 에셋 기록 — 2026-10-24

방식: 기본 제공 `image_gen` 도구. 별도 API 키나 CLI fallback을 사용하지 않았다. 원본 PNG를 프로젝트로 복사했고 원본은 삭제하지 않았다.

## 암모나이트

저장: `app/public/assets/ammonite.png` (2,887,320 bytes). 배경 투명 옵션 true. 표본의 외곽·나선·갈비 무늬·석회암 질감을 시각 검토했다. 이 이미지는 학술적으로 인증된 실물 사진이 아닌 시각적 재구성이다.

최종 프롬프트:

```text
Use case: product-mockup. Asset type: single premium game specimen texture for a Korean mobile fossil excavation ASMR app. Create a photorealistic top-down museum specimen of one large golden-brown ammonite fossil embedded in an irregular roughly rounded slab of pale warm limestone. Entire stone slab visible with generous transparent margin all sides, occupying 78% of square canvas. Camera exactly overhead orthographic, broad fossil centered, detailed raised spiral shell, strong articulated ribs and suture lines, natural chipped edges, porous limestone and fine mineral texture, subtle occlusion shadow in grooves. Restrained warm ochre and umber tones, soft upper-left studio lighting, realistic tactile 2.5D depth. This is a visual reconstruction, not a labeled scientific image. Background genuinely transparent. No text, labels, ruler, pedestal, tools, extra fossils, scenery, watermark, sparkles, or graphics. High detail at mobile display size. Output one square bitmap.
```

## 암석 표면

저장: `app/public/assets/limestone.png` (4,265,556 bytes). 배경 투명 옵션 false. 표면 텍스처를 표본 외곽 알파 마스크로 합성해 4개 층에 사용한다.

최종 프롬프트:

```text
Use case: product-mockup. Asset type: seamless-looking macro limestone rock surface texture used for destructible layers in a fossil excavation mobile game. Square image completely filled edge-to-edge with warm taupe sandstone and limestone, no background or silhouette. Photoreal high detail rough weathered sedimentary rock, naturally chipped facets and tiny grains, subtle irregular hairline fissures, small mineral inclusions, soft diffuse top-left illumination, middle value beige brown, restrained warm palette. Flat overhead rock face with tactile relief but no large central objects, fossil, shell, text, watermark, tools, glowing cracks, or dramatic hard shadows. Not a wall of bricks. Texture should read clearly when rendered on a 300px stone slab.
```
