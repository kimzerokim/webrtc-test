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

socket.on('full', room => {
  console.log(`room ${room} is full`)
})

socket.on('ready', () => {
  if (isCaller) {
    createPeerConnection()
    rtcPeerConnection.createOffer()
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
  console.log('offer is received')
  if (!isCaller) {
    createPeerConnection();
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
    rtcPeerConnection.createAnswer()
    .then(desc => setLocalAndAnswer(desc))
    .catch(e => console.log(e));
  }
});

socket.on('answer', function (event) {
  console.log('answer is received')
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
})

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
      room: roomId
  });
}

function setLocalAndAnswer(sessionDescription) {
  rtcPeerConnection.setLocalDescription(sessionDescription);
  socket.emit('answer', {
      type: 'answer',
      sdp: sessionDescription,
      room: roomId
  });
}

function addLocalStream(stream) {
  localStream = stream
  localAudio.srcObject = stream
}

function createPeerConnection() {
  rtcPeerConnection = new RTCPeerConnection(iceServers)
  rtcPeerConnection.onicecatidate = onIceCandidate
  rtcPeerConnection.onaddstream = onAddStream
  rtcPeerConnection.addStream(localStream)
}