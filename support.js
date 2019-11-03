

var values = []

function checkCheckboxes() {
  values = [];
  var inputs = document.getElementsByTagName("input");
  for (var i = inputs.length - 1; i >= 0; i--)
    if (inputs[i].type === "checkbox" && inputs[i].checked)
      values.push(inputs[i].value);

  var inputs = document.getElementsByTagName("input");
  for (var i = inputs.length - 1; i >= 0; i--)
    if (inputs[i].type === "checkbox" && inputs[i].checked)
      values.push('no_'+inputs[i].value);
  console.log(values)
}

var blacklistClasses = [];

var x = 0;
var y = 0;
var h = 0;
var w = 0;

function drawBoundary(result) {
  for (i = 0; i < result.objects.length; i++) {

    //remove this line if you don't want to restrict the predictions
    if (values.includes(result.objects[i].object)) {

      var canvas = document.getElementById('canvas');
      var ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.lineWidth = "6";

      var object_class = result.objects[i].object;

      switch (object_class) {
        case "person":
          ctx.fillStyle = "red";
          ctx.strokeStyle = "red";
          break;

        default:
          ctx.fillStyle = "Chartreuse";
          ctx.strokeStyle = "Chartreuse";
      }

      // get rectangle boundaries
      x = result.objects[i].rectangle.x;
      y = result.objects[i].rectangle.y;
      w = result.objects[i].rectangle.w;
      h = result.objects[i].rectangle.h;


      ctx.font = "22px Arial";
      ctx.fillText(result.objects[i].object + " (confidence: " + result.objects[i].confidence + ")", x, y - 10);
      ctx.rect(x, y, w, h);
      ctx.stroke();
    }
  }
}


var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var video = document.getElementById('video');

var continuePrediction;

function stopPrediction() {
  continuePrediction = false;
}

video.addEventListener('play', function () {
  var $this = this; //cache
  document.getElementById("video").style.display = "none";
  (function loop() {
    if (continuePrediction) { //!$this.paused && !$this.ended) {
      ctx.drawImage($this, 0, 0);
      setTimeout(loop, 1000 / 5); // drawing at 5fps

      var blob = b64toBlob(canvas.toDataURL());
      detect_object(blob)
    }
  })();
}, 0);


function b64toBlob(dataURI) {

  var byteString = atob(dataURI.split(',')[1]);
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);

  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], {
    type: 'image/jpeg'
  });
}


function detect_object(url) {

  if (continuePrediction) {
    const computerVisionKey = document.getElementById('visionkey').value;
    const computerVisionEndPoint = document.getElementById('visionendpoint').value;
    const cognitiveServiceCredentials = new msRest.ApiKeyCredentials({
      inHeader: {
        "Ocp-Apim-Subscription-Key": computerVisionKey
      }
    });
    const client = new Azure.CognitiveservicesComputervision.ComputerVisionClient(
      cognitiveServiceCredentials,
      computerVisionEndPoint
    );

    const options = {
      maxCandidates: 1,
      language: "en"
    };

    client
      .detectObjectsInStream(url, options)
      .then((result) => {
        console.log("The result is:");
        drawBoundary(result);
      })
      .catch((err) => {
        console.log("An error occurred:");
        console.error(err);
      });
  }


};

var video;
var webcamStream;


function startWebcam() {
  checkCheckboxes();
  continuePrediction = true;
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(

        // constraints
        {
          video: true,
          audio: false
        }).then(

        // successCallback
        function (localMediaStream) {
          video.srcObject = localMediaStream;
          webcamStream = localMediaStream;
        })
      .catch(
        // errorCallback
        function (err) {
          console.log("The following error occured: " + err);
        })

  } else {
    console.log("getUserMedia not supported");
  }
}

