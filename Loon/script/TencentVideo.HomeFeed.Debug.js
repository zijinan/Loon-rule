/* 腾讯视频首页推荐请求命中日志：只观察，不修改请求 */
(function () {
  try {
    const b=(typeof $request!=="undefined" && $request && $request.body) || null;
    let found=false, kind="none";
    if(typeof b==="string") { kind="string"; found=b.includes("getMVLPage")||b.includes("MVLSecondPageService"); }
    else if(b && typeof b.length==="number") {
      kind="binary";
      const keys=["getMVLPage","MVLSecondPageService"];
      for(const word of keys) {
        scan: for(let i=0;i+word.length<=b.length;i++) {
          for(let j=0;j<word.length;j++)if(b[i+j]!==word.charCodeAt(j))continue scan;
          found=true;break scan;
        }
      }
    }
    if(found)console.log("[TX-首页][诊断] 命中首页请求; body="+kind+" bytes="+(b?b.length:0));
  }catch(e){console.log("[TX-首页][诊断] "+String(e));}
  $done({});
})();
