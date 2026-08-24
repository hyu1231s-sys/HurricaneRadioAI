import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8'),a=html.indexOf('<script>'),b=html.lastIndexOf('</script>');
if(a<0||b<=a)throw new Error('INLINE_JS_NOT_FOUND');
fs.writeFileSync('/tmp/hrai-inline-rc1421.js',html.slice(a+8,b));
