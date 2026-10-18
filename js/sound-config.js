/* =========================================================
   사운드 설정 — 여기만 고치면 된다.

   src 에는 둘 중 하나를 넣는다.
     · mp3/ogg 파일 경로   예) 'assets/sound/bgm/main.mp3'
     · 유튜브 링크          예) 'https://www.youtube.com/watch?v=XXXXXXXXXXX'
       (링크 끝에 &t=30 처럼 시작 초를 붙이면 그 지점부터 재생)
   비워 두면('') 그 소리는 재생하지 않는다.

   volume: 0 ~ 1
   ========================================================= */
window.SOUND_CONFIG = {

  // 페이드 인/아웃 시간 (밀리초)
  fadeMs: 1400,

  // 기본 배경음악 — 계속 재생된다
  main: { src: '', volume: 0.5 },

  // 오리진 프로필을 열면 기본 배경음악 대신 재생되는 곡.
  // 비어 있는 오리진은 기본 배경음악이 그대로 이어진다.
  origins: {
    just:  { src: '', volume: 0.5 },
    moss:  { src: '', volume: 0.5 },
    chan:  { src: '', volume: 0.5 },
    sis:   { src: '', volume: 0.5 },
    kaien: { src: '', volume: 0.5 },
    mary:  { src: '', volume: 0.5 }
  },

  // 효과음 — 짧은 mp3/ogg/wav 파일만 가능 (유튜브 불가)
  sfx: {
    click:   { src: 'assets/sound/sfx/click.mp3',   volume: 0.5 },  // 버튼 클릭
    hover:   { src: 'assets/sound/sfx/hover.mp3',   volume: 0.25 }, // 메뉴·마커에 커서를 올릴 때
    open:    { src: 'assets/sound/sfx/open.mp3',    volume: 0.5 },  // 창·팝업이 켜질 때 (전원 ON)
    close:   { src: 'assets/sound/sfx/close.mp3',   volume: 0.45 }, // 창·팝업이 꺼질 때
    reveal:  { src: 'assets/sound/sfx/reveal.mp3',  volume: 0.5 },  // 스포일러 열람 / 초월자 기록 전환
    type:    { src: 'assets/sound/sfx/type.mp3',    volume: 0.2 },  // 접속 화면 타이핑
    granted: { src: 'assets/sound/sfx/granted.mp3', volume: 0.6 }   // 접속 화면 ACCESS GRANTED
  }
};
