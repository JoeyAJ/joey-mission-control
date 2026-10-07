// Official SDK QR payload stays in an image data URL, never inline SVG/HTML.
export function ownerTotpImageSource(value){
 if(typeof value!=='string')throw Error('MFA_QR_INVALID');
 if(value.length>1000000)throw Error('MFA_QR_TOO_LARGE');
 const match=/^data:image\/svg\+xml;(?:utf-8|utf8|charset=utf-8),([\s\S]+)$/i.exec(value);
 if(!match)throw Error('MFA_QR_INVALID');
 let svg=match[1];
 if(!svg.trimStart().startsWith('<'))try{svg=decodeURIComponent(svg);}catch{throw Error('MFA_QR_INVALID');}
 if(!/^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg(?:\s|\/?>)/i.test(svg))throw Error('MFA_QR_INVALID');
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
