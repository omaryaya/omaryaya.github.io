(function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get("cancelled")) {
    document.getElementById("purchase-cancelled").style.display = "block";
  }

  document.getElementById("buy-button").addEventListener("click", function () {
    var button = this;
    button.disabled = true;
    button.textContent = "Redirecting to checkout…";

    fetch("/.netlify/functions/create-checkout-session", { method: "POST" })
      .then(function (res) {
        if (!res.ok) throw new Error("Checkout session request failed");
        return res.json();
      })
      .then(function (data) {
        if (!data.url) throw new Error("No checkout URL returned");
        window.location.href = data.url;
      })
      .catch(function (err) {
        console.error(err);
        var errorBox = document.getElementById("purchase-error");
        errorBox.textContent = "Something went wrong starting checkout. Please try again.";
        errorBox.style.display = "block";
        button.disabled = false;
        button.textContent = "Buy Now — €0.93";
      });
  });
})();
