let isRegistering = false; // State to track if we are in login or register mode

/**
 * Shows the authentication form and sets it up for the selected role.
 * @param {string} role - 'consumer', 'farmer', or 'admin'
 */
function showAuthForm(role) {
  const authFormSection = document.getElementById("authForm");
  const loginForm = document.getElementById("loginForm");
  hideFormMessage(); // Hide any previous messages

  // Store the current role on the form's dataset for later access
  loginForm.dataset.role = role;

  // Reset to login view by default when a new role is clicked
  isRegistering = false;
  loginForm.reset();

  // Show the form section and scroll to it
  authFormSection.classList.remove("hidden");
  authFormSection.scrollIntoView({ behavior: 'smooth' });

  // Update the UI (title, button text, etc.)
  updateFormUI();
}

/**
 * Toggles the form between Login and Register states.
 */
function toggleRegister() {
  isRegistering = !isRegistering;
  hideFormMessage(); // Hide any previous messages
  document.getElementById("loginForm").reset(); // Clear form fields
  updateFormUI();
}

/**
 * Updates the form's title, button text, and Aadhaar field visibility.
 */
function updateFormUI() {
  const formTitle = document.getElementById('formTitle');
  const loginForm = document.getElementById('loginForm');
  const aadharFieldContainer = document.getElementById("aadharFieldContainer");
  const aadharInput = document.getElementById("aadharInput");
  const registerLink = document.querySelector('#authForm p');
  const role = loginForm.dataset.role;

  const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);

  if (isRegistering) {
    formTitle.textContent = `Register as ${roleCapitalized}`;
    loginForm.querySelector('button').textContent = 'Register';
    registerLink.innerHTML = `Already have an account? <a href="#" onclick="toggleRegister()">Login here</a>`;
    // Show Aadhaar field ONLY for farmer registration
    if (role === 'farmer') {
      aadharFieldContainer.classList.remove('hidden');
      aadharInput.required = true;
    } else {
      aadharFieldContainer.classList.add('hidden');
      aadharInput.required = false;
    }
  } else {
    formTitle.textContent = `Login as ${roleCapitalized}`;
    loginForm.querySelector('button').textContent = 'Login';
    registerLink.innerHTML = `Don’t have an account? <a href="#" onclick="toggleRegister()">Register here</a>`;
    // Show Aadhaar field ONLY for farmer login
    if (role === 'farmer') {
      aadharFieldContainer.classList.remove('hidden');
      aadharInput.required = true;
    } else {
      aadharFieldContainer.classList.add("hidden");
      aadharInput.required = false;
    }
  }
}

/**
 * Displays a message within the form.
 * @param {string} message The message to display.
 * @param {boolean} isError True for an error message, false for success.
 */
function showFormMessage(message, isError) {
  const messageContainer = document.getElementById('formMessage');
  messageContainer.textContent = message;
  messageContainer.className = isError ? 'form-message error' : 'form-message success';
  messageContainer.classList.remove('hidden');
}

function hideFormMessage() {
  const messageContainer = document.getElementById('formMessage');
  messageContainer.classList.add('hidden');
}

// Handle form submission for both login and registration
document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const role = this.dataset.role;
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const aadhar = document.getElementById("aadharInput").value;
  hideFormMessage(); // Hide previous messages on new submission
  const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
  const body = { role, username, password };

  if (role === 'farmer') {
    body.aadhar = aadhar;
  }

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
    .then(res => res.json())
    .then(data => {
      // The backend now sends a 'token' on success
      if (data.token) {
        // Store user info in localStorage for other pages to use
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('cart', JSON.stringify(data.cart || {})); // Save the persistent cart
        // Redirect to the correct dashboard page
        window.location.href = `/${data.role}.html`;
      } else {
        showFormMessage(data.msg, true);
      }
    })
    .catch(err => console.error("Error:", err));
});
