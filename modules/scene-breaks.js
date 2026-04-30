export default function sceneBreaksModule() {
  const btn = document.getElementById("insertSceneBreak");

  btn.onclick = () => {
    document.execCommand("insertHTML", false,
      `<div style="text-align:center;margin:20px 0;color:#D4AF37;">✦ ✦ ✦</div>`
    );
  };
}
