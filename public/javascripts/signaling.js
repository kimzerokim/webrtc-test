'use strict'

const localAudio = document.getElementById('audio1')
const remoteAudio = document.getElementById('audio2')
const callBtn = document.getElementById('callButton')

const roomId = 'demo'
let localStream
let remoteStream
let rtcPeerConnection
let isCaller

const iceServers = {
  'iceServers': [{
          'url': 'stun:stun.services.mozilla.com'
      },
      {
          'url': 'stun:stun.l.google.com:19302'
      }
  ]
}
const streamConstraints = {
  video: false,
  audio: true,
}

const socket = io()

callBtn.onclick = () => initiateCall()

function initiateCall() {
  socket.emit('create or join', roomId)
}

// Receive message 'created' from server
socket.on('created', room => {
  navigator.mediaDevices.getUserMedia(streamConstraints).then(stream => {
    addLocalStream(stream)
    isCaller = true
  }).catch(err => {
    console.log('An error ocurred when accessing media devices');
  })
})

socket.on('joined', room => {
  navigator.mediaDevices.getUserMedia(streamConstraints).then(stream => {
    addLocalStream(stream)
    socket.emit('ready', roomId)
  }).catch(err => {
    console.log('An error ocurred when accessing media devices');
  })
})

socket.on('ready', () => {
  if (isCaller) {
    createPeerConnetion()
    let offerOptions = {
      offerToReceiveAudio: true
    }
    rtcPeerConnection.createOffer(offerOptions)
    .then(desc => setLocalAndOffer(desc))
    .catch(err => console.log(err))
  }
})

socket.on('candidate', event => {
  const candidate = new RTCIceCandidate({
      sdpMLineIndex: event.label,
      candidate: event.candidate
  })
  rtcPeerConnection.addIceCandidate(candidate)
})

socket.on('offer', event => {
  if (!isCaller) {
    createPeerConnection();
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
    rtcPeerConnection.createAnswer()
    .then(desc => setLocalAndAnswer(desc))
    .catch(e => console.log(e));
  }
});

function onIceCandidate(event) {
  if (event.candidate) {
      console.log('sending ice candidate');
      socket.emit('candidate', {
          type: 'candidate',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
          room: roomId
      })
  }
}

function onAddStream(event) {
  remoteAudio.srcObject = event.stream;
  remoteStream = event.stream;
}

function setLocalAndOffer(sessionDescription) {
  rtcPeerConnection.setLocalDescription(sessionDescription);
  socket.emit('offer', {
      type: 'offer',
      sdp: sessionDescription,
      room: roomNumber
  });
}

function setLocalAndAnswer(sessionDescription) {
  rtcPeerConnection.setLocalDescription(sessionDescription);
  socket.emit('answer', {
      type: 'answer',
      sdp: sessionDescription,
      room: roomNumber
  });
}

function addLocalStream(stream) {
  localStream = stream
  localAudio.srcObject = stream
}

function createPeerConnetion() {
  rtcPeerConnection = new RTCPeerConnection(iceServers)
  rtcPeerConnection.onicecatidate = onIceCandidate
  rtcPeerConnection.onaddstream = onAddStream
  rtcPeerConnection.addStream(localStream)
}