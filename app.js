var $=function(s){return document.querySelector(s)};
var BASE=location.origin+location.pathname,q=new URLSearchParams(location.search);
function clean(n){return (n||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20)}
var me=clean(q.get('me'))||clean(localStorage.getItem('cbhp_me')),from=clean(q.get('listen'));
if(!me&&from)me='guest'+Math.random().toString(36).slice(2,6);
var mode=from?'hear':(localStorage.getItem('cbhp_mode')||'send'),src='mic',live=false,listeners={},cur=null,ctx,gain,dest,au=$('#au'),songEl=$('#songEl'),songNode,file=null;
function st(t,ok){$('#st').textContent=t;$('#st').className=ok?'ok':''}
if(!me){$('#setup').classList.remove('hide');$('#nm').focus()}else go();
$('#start').onclick=function(){var n=clean($('#nm').value);if(!n){$('#nm').focus();return}me=n;go()};
$('#nm').onkeydown=function(e){if(e.key=='Enter')$('#start').click()};
function audio(){if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();gain=ctx.createGain();dest=ctx.createMediaStreamDestination();gain.connect(dest);gain.gain.value=+$('#sv').value}if(ctx.state=='suspended')ctx.resume();return ctx}
function outTrack(){return dest?dest.stream.getAudioTracks()[0]:null}
function pushAll(){Object.keys(listeners).forEach(function(n){CBLink.setTrack(n,live?outTrack():null).catch(function(){})})}
function cnt(){var k=Object.keys(listeners).length;$('#cnt').textContent=k?(k==1?'1 listening: ':k+' listening: ')+Object.keys(listeners).join(', '):'No one listening yet'}
function setMode(m){mode=m;localStorage.setItem('cbhp_mode',m);$('#mSend').classList.toggle('on',m=='send');$('#mHear').classList.toggle('on',m=='hear');$('#send').classList.toggle('hide',m!='send');$('#hear').classList.toggle('hide',m!='hear');
 if(m=='send')st(live?'Sending':'Ready to send',live);else if(!from)st('Type the sender name')}
function go(){localStorage.setItem('cbhp_me',me);history.replaceState(null,'',BASE+'?me='+me+(from?'&listen='+from:''));
 $('#setup').classList.add('hide');$('#app').classList.remove('hide');
 new QRCode($('#qr'),{text:BASE+'?listen='+me,width:120,height:120,colorDark:'#6b1240'});
 if(!(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia)||/iPhone|iPad|Android/i.test(navigator.userAgent))$('#tabBtn').classList.add('hide');
 if(window.WebKitPlaybackTargetAvailabilityEvent)$('#air').classList.remove('hide');
 CBLink.init({me:me,prefix:'cbhp-',stream:function(){return live?outTrack():null},
  onStatus:function(n,t,ok){if(mode=='hear'&&n==from&&!ok)st(t)},
  onOpen:function(n,ms){if(n==from){window.HP.ms=ms;st('Connected to '+n,true)}else{listeners[n]=1;cnt();CBLink.setTrack(n,live?outTrack():null).catch(function(){})}},
  onClose:function(n){if(listeners[n]){delete listeners[n];cnt()}if(n==from){st('Reconnecting…');$('#play').textContent='Waiting';$('#play').classList.remove('on')}},
  onTrack:function(n,s){if(n!=from)return;au.srcObject=s;hear()},
  onMsg:function(n,m){if(m.t=='live'&&n==from)$('#play').textContent=m.on?'Playing':'Sender stopped'}});
 if(from){$('#from').value=from;CBLink.want(from,true)}
 setMode(mode);wake()}
function hear(){au.volume=+$('#hv').value;var p=au.play();if(p&&p.then)p.then(function(){$('#play').textContent='Playing';$('#play').classList.add('on')}).catch(function(){$('#play').textContent='Tap to hear';$('#play').classList.remove('on')})}
$('#play').onclick=function(){hear()};
$('#mSend').onclick=function(){setMode('send')};$('#mHear').onclick=function(){setMode('hear')};
$('#listenBtn').onclick=function(){var n=clean($('#from').value);if(!n||n==me)return;from=n;history.replaceState(null,'',BASE+'?me='+me+'&listen='+from);CBLink.want(from,true);st('Finding '+from+'…')};
$('#hv').oninput=function(){au.volume=+this.value};
$('#mute').onclick=function(){au.muted=!au.muted;this.classList.toggle('on',au.muted);this.textContent=au.muted?'Unmute':'Mute'};
$('#out').onclick=function(){var md=navigator.mediaDevices;if(md&&md.selectAudioOutput&&au.setSinkId){md.selectAudioOutput().then(function(d){return au.setSinkId(d.deviceId)}).then(function(){$('#out').textContent='Headset on'}).catch(function(){})}else{$('#out').textContent='Use phone settings'}};
$('#air').onclick=function(){try{(au.srcObject?au:songEl).webkitShowPlaybackTargetPicker()}catch(e){}};
document.querySelectorAll('[data-src]').forEach(function(b){b.onclick=function(){if(live)stop();src=b.dataset.src;document.querySelectorAll('[data-src]').forEach(function(x){x.classList.toggle('on',x===b)});if(src=='song')$('#file').click()}});
$('#file').onchange=function(){file=this.files[0];if(file){songEl.src=URL.createObjectURL(file);$('#songName').textContent=file.name}};
$('#sv').oninput=function(){if(gain)gain.gain.value=+this.value};
$('#go').onclick=function(){live?stop():start()};
function start(){audio();var p;
 if(src=='mic')p=navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}).then(function(s){cur={s:s,n:ctx.createMediaStreamSource(s)};cur.n.connect(gain)});
 else if(src=='tab')p=navigator.mediaDevices.getDisplayMedia({video:true,audio:true}).then(function(s){if(!s.getAudioTracks().length){s.getTracks().forEach(function(t){t.stop()});throw 0}cur={s:s,n:ctx.createMediaStreamSource(s)};cur.n.connect(gain)});
 else{if(!file){$('#file').click();return}if(!songNode)songNode=ctx.createMediaElementSource(songEl);songNode.connect(gain);cur={song:1};songEl.loop=true;p=songEl.play()}
 Promise.resolve(p).then(function(){live=true;$('#go').textContent='Stop';$('#go').classList.add('stop');st('Sending',true);pushAll();tell()}).catch(function(){st('Sound not allowed')})}
function stop(){live=false;if(cur){if(cur.s)cur.s.getTracks().forEach(function(t){t.stop()});if(cur.n)cur.n.disconnect();if(cur.song){songEl.pause();songNode.disconnect()}}cur=null;$('#go').textContent='Start';$('#go').classList.remove('stop');st('Ready to send');pushAll();tell()}
function tell(){Object.keys(listeners).forEach(function(n){CBLink.send(n,{t:'live',on:live})})}
$('#share').onclick=function(){var u=BASE+'?listen='+me;if(navigator.share)navigator.share({title:'Coffeebreak Headphone',text:'Listen with me',url:u}).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){$('#share').textContent='Link copied'})};
var wl;function wake(){try{if(navigator.wakeLock&&!document.hidden)navigator.wakeLock.request('screen').then(function(w){wl=w}).catch(function(){})}catch(e){}}
document.addEventListener('visibilitychange',function(){if(!document.hidden){wake();if(au.srcObject)hear()}});
window.HP={level:function(){if(!au.srcObject)return -1;if(!window._an){var c=new AudioContext(),a=c.createAnalyser();a.fftSize=2048;c.createMediaStreamSource(au.srcObject).connect(a);window._an=a;window._ac=c}var d=new Float32Array(2048);window._an.getFloatTimeDomainData(d);var m=0;for(var i=0;i<d.length;i++)m=Math.max(m,Math.abs(d[i]));return m},count:function(){return Object.keys(listeners).length}};
