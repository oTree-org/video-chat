'use strict';
let pc;

let startTime;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');


function gotRemoteStream(e) {
    if (remoteVideo.srcObject !== e.streams[0]) {
        remoteVideo.srcObject = e.streams[0];
        console.log('pc received remote stream!');
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
    pc.addEventListener('icecandidate', onIceCandidate);
    pc.addEventListener('connectionstatechange', onConnectionStateChange);
    pc.addEventListener('track', gotRemoteStream);

    return pc;
}

pc = makePeerConnection();

function onConnectionStateChange(event) {
    console.log('connection state change:', pc.connectionState)
    if (pc.connectionState === 'connected') {
        console.log('peers connected!')
    }
}

let localStream;

async function start() {
    try {
        let mediaDevices = navigator.mediaDevices;
        if (mediaDevices === undefined && window.location.href.startsWith('http:')) {
            alert("Webcam access not available on http:// URLs. If you are on Heroku, try changing the url to start with https://");
            return;
        }
        const stream = await mediaDevices.getUserMedia({audio: true, video: true});
        console.log('Received local stream');
        localVideo.srcObject = stream;
        localStream = stream;
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    } catch (e) {
        console.log('error:')
        console.log(e);
        alert(`Error with getUserMedia(): ${e.name}`);
    }
}

function liveSendVideoChat(data) {
    // namespace all messages so that it doesn't interfere with the user's other live page messages
    data.video_chat = true;
    liveSend(data);
}

async function onIceCandidate(event) {
    console.log('in onIceCandidate');
    if (event.candidate) {
        console.log('event has candidate');
        liveSendVideoChat({type: 'ice_candidate', 'ice_candidate': event.candidate});
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
    console.log("created offer")
    liveSendVideoChat({type: 'offer', sdp: offer});
}


const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};


function liveRecvVideoChat(data) {
    let type = data.type;
    console.log('in liveRecv:', type)
    if (type === 'answer') {
        onAnswer(data.sdp);
    }
    if (type === 'offer') {
        onOffer(data.sdp);
    }
    if (type === 'ice_candidate') {
        pc.addIceCandidate(data.ice_candidate);
    }
}

async function onOffer(desc) {
    let sdp = new RTCSessionDescription(desc);
    console.log("Received offer")
    await pc.setRemoteDescription(desc);
    console.log('setRemoteDescription')
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log('setLocalDescription')
    liveSendVideoChat({type: 'answer', sdp: answer});
}

async function onAnswer(desc) {
    let sdp = new RTCSessionDescription(desc);
    await pc.setRemoteDescription(sdp);
    console.log('set remote description');
}