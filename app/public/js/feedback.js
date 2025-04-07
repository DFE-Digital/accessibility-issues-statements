document.addEventListener('DOMContentLoaded', function () {
    const problemButton = document.getElementById('problemButton');
    const cancelButton = document.getElementById('cancelButton');
    const feedbackPanel = document.getElementById('feedback-panel');
    const thanksMessage = document.getElementById('thanksMessage');
    const feedbackHeading = document.querySelector('.govuk-heading-s'); // Target the heading
    const feedbackForm = document.getElementById('feedback-form'); // Correct form selector

    // Show feedback panel when clicking "Give feedback"
    problemButton.addEventListener('click', function () {
        feedbackPanel.style.display = 'block';
        problemButton.style.display = 'none'; // Hide the button
        feedbackHeading.style.display = 'none'; // Hide the heading
    });

    // Hide feedback panel when clicking "Cancel"
    cancelButton.addEventListener('click', function () {
        feedbackPanel.style.display = 'none';
        problemButton.style.display = 'block'; // Show the button again
        feedbackHeading.style.display = 'block'; // Show the heading again
        thanksMessage.hidden = true; // Ensure the thank you message is hidden
    });

    // Handle form submission
    feedbackForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent default form submission

        const feedbackInput = document
            .getElementById('feedback_form_input')
            .value
            .trim();

        if (feedbackInput === '') {
            alert("Please provide some feedback before submitting.");
            return;
        }

        submitDetailedFeedback(feedbackInput);
    });

    function submitDetailedFeedback(feedback) {
        fetch('/form-response/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ response: feedback }) // Ensure the correct key
        })
            .then(response => {
                if (!response.ok) {
                    return response
                        .json()
                        .then(errData => {
                            throw new Error(errData.message || `HTTP error! Status: ${response.status}`);
                        });
                }
                return response.json();
            })
            .then(data => {
                console.log('Success:', data);
                thanksMessage.hidden = false; // Show the thank you message
                feedbackPanel.style.display = 'none'; // Hide the form
                problemButton.style.display = 'block'; // Show the original button again
                feedbackHeading.style.display = 'block'; // Restore heading visibility
            })
            .catch((error) => {
                console.error('Error:', error);
                alert(`Error submitting feedback: ${error.message}`);
            });
    }
});