var servicesTab = document.getElementById("services-tab"), servicesPanel = document.getElementById("services-panel"), closeNav = document.getElementById("closeNav"); servicesTab.addEventListener("click", function (e) { e.preventDefault(), "none" === servicesPanel.style.display ? (servicesPanel.style.display = "block", servicesPanel.setAttribute("aria-hidden", "false"), servicesTab.setAttribute("aria-expanded", "true")) : (servicesPanel.style.display = "none", servicesPanel.setAttribute("aria-hidden", "true"), servicesTab.setAttribute("aria-expanded", "false")) }), document.addEventListener("keydown", function (e) { "Escape" !== e.key && "Esc" !== e.key || (e.preventDefault(), "block" === servicesPanel.style.display && (servicesPanel.style.display = "none", servicesPanel.setAttribute("aria-hidden", "true"), servicesTab.setAttribute("aria-expanded", "false"))) }), closeNav.addEventListener("click", function (e) { e.preventDefault(), servicesPanel.style.display = "none", servicesPanel.setAttribute("aria-hidden", "true"), servicesTab.setAttribute("aria-expanded", "false") });

document.addEventListener("DOMContentLoaded", function () {
    const copyButtons = document.querySelectorAll(".copy-btn");

    copyButtons.forEach(button => {
        button.addEventListener("click", function () {
            const targetId = this.getAttribute("data-copy-target");
            const codeElement = document.getElementById(targetId);
            const textToCopy = codeElement.innerText;

            navigator
                .clipboard
                .writeText(textToCopy)
                .then(() => {
                    this.textContent = "Copied!";
                    setTimeout(() => {
                        this.textContent = "Copy code";
                    }, 2000);
                })
                .catch(err => {
                    console.error("Failed to copy text: ", err);
                });
        });
    });
});
