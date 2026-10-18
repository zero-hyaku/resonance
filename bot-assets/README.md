# bot-assets

레조넌스 봇에서 쓸 이미지를 보관하는 폴더. **홈페이지 코드는 이 폴더를 전혀 참조하지 않는다.**
여기에 넣거나 지워도 사이트에는 아무 영향이 없다.

## 이미지 주소 만들기

`bot-assets/파일이름.png` 로 올렸다면, 봇에는 아래 둘 중 하나를 쓰면 된다.

| 방식 | 주소 |
| --- | --- |
| GitHub Pages | `https://zero-hyaku.github.io/resonance/bot-assets/파일이름.png` |
| raw 링크 | `https://raw.githubusercontent.com/zero-hyaku/resonance/main/bot-assets/파일이름.png` |

- 하위 폴더를 만들어도 된다. 예) `bot-assets/just/smile.png` → 주소에도 `bot-assets/just/smile.png`
- 파일 이름은 **영문·숫자·하이픈(-)** 만 쓰는 걸 추천. 한글이나 띄어쓰기가 들어가면 주소가 깨지기 쉽다.
- 두 방식 모두 저장소가 **공개(public)** 여야 외부에서 보인다. GitHub Pages 주소는 Pages가 켜져 있어야 한다.
