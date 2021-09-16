'use strict';
let pc;

let startTime;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');


function gotRemoteStream(e) {
    if (remoteVideo.srcObject !== e.streams[0]) {
        remoteVideo.srcObject = e.streams[0];
        console.log('pc received remote stream');
    }
}


function makePeerConnection() {
    const configuration = {
        'iceServers': [
            {urls: 'stun:stun1.l.google.com:19302'},
            {urls: 'stun:stun2.l.google.com:19302'},
        ]
    }
    pc = new RTCPeerConnection(configuration);
    pc.addEventListener('icecandidate', e => onIceCandidate(pc, e));
    pc.addEventListener('connectionstatechange', event => {
        console.log('connectionstatechange', pc.connectionState)
        if (pc.connectionState === 'connected') {
            console.log('peers connected!')
        }
    });
    pc.addEventListener('track', gotRemoteStream);

    return pc;
}

pc = makePeerConnection();


let localStream;

async function start() {
    try {
        let mediaDevices = navigator.mediaDevices;
        if (mediaDevices === undefined && window.location.href.startsWith('http:')) {
            alert("Webcam access not available on http:// URLs. Try using Chrome or change the url to https://");
            return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
        console.log('Received local stream');
        localVideo.srcObject = stream;
        localStream = stream;
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    } catch (e) {
        console.log('error is', e);
        alert(`Error with getUserMedia(): ${e.name}`);
    }
}


async function onIceCandidate(pc, event) {
    console.log('candidate', event);
    if (event.candidate) {
        liveSend({type: 'ice_candidate', 'ice_candidate': event.candidate});
    }
}

document.addEventListener("DOMContentLoaded", async (event) => {
    await start();
    await call();
});


async function call() {
    startTime = window.performance.now();
    const offer = await pc.createOffer(offerOptions);
    await pc.setLocalDescription(offer);
    liveSend({type: 'offer', offer: offer});
    console.log('did liveSend')
}


const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};


function liveRecv(data) {
    console.log('in liveRecv')
    let type = data.type;
    console.log(type);
    if (type === 'answer') {
        let offer = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(offer).then(e => {
            console.log('set remote description');
        });
    }
    if (type === 'offer') {
        let offer = new RTCSessionDescription(data.offer);
        onOffer(offer).then(e => {
        });
    }
    if (type === 'ice_candidate') {
        pc.addIceCandidate(data.ice_candidate);
    }
}

async function onOffer(desc) {
    //console.log(`Offer from pc1\n${desc.sdp}`);
    //pc = makePeerConnection();
    await pc.setRemoteDescription(desc);
    console.log('setRemoteDescription')
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log('setLocalDescription')
    liveSend({type: 'answer', answer: answer});

}
