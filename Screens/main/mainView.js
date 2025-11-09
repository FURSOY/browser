document.addEventListener("DOMContentLoaded", function () {
    window.bridge.updateMessage(updateMessage);
});

function updateMessage(event, message) {
    console.log("message logged in view");

    let elemE = document.getElementById("message");
    console.log(elemE);
    elemE.innerHTML = message;
}