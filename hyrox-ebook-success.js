(function () {
  var params = new URLSearchParams(window.location.search);
  var sessionId = params.get("session_id");

  var verifying = document.getElementById("verifying");
  var ready = document.getElementById("download-ready");
  var errorBox = document.getElementById("verify-error");

  function showError(message) {
    verifying.style.display = "none";
    errorBox.textContent = message;
    errorBox.style.display = "block";
  }

  if (!sessionId) {
    showError(
      "No checkout session found. If you completed a payment, check your email receipt from Stripe and contact support."
    );
    return;
  }

  fetch("/.netlify/functions/verify-purchase?session_id=" + encodeURIComponent(sessionId))
    .then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, data: data };
      });
    })
    .then(function (result) {
      if (!result.ok || !result.data.ok) {
        throw new Error(result.data.error || "Could not verify your purchase");
      }
      verifying.style.display = "none";
      ready.style.display = "block";
      document.getElementById("download-link").href = result.data.downloadUrl;
    })
    .catch(function (err) {
      showError(
        (err.message || "Could not verify your purchase") +
          " — please contact support with your session ID: " +
          sessionId
      );
    });
})();
