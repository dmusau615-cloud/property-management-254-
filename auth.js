"use strict";

(() => {
    const USERS_KEY = "propertyHubActiveUsers";
    const SESSION_KEY = "propertyHubActiveSession";
    const ITERATIONS = 120000;

    const getUsers = () => {
        const savedUsers = localStorage.getItem(USERS_KEY);
        if (!savedUsers) return [];

        const users = JSON.parse(savedUsers);
        if (!Array.isArray(users)) {
            throw new Error("Saved account data is invalid.");
        }
        return users;
    };

    const setMessage = (element, message, isError) => {
        if (!element) return;
        element.textContent = message;
        element.classList.toggle("error", Boolean(isError));
        element.classList.toggle("success", !isError);
    };

    const toHex = (bytes) =>
        Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

    const fromHex = (hex) => {
        if (typeof hex !== "string" || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
            throw new Error("Saved account data is invalid.");
        }
        return Uint8Array.from(hex.match(/.{2}/g), (byte) => parseInt(byte, 16));
    };

    const hashPassword = async (password, salt) => {
        if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
            throw new Error("Password hashing requires a modern browser on localhost or HTTPS.");
        }

        const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            "PBKDF2",
            false,
            ["deriveBits"]
        );
        const hash = await crypto.subtle.deriveBits(
            { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
            key,
            256
        );
        return toHex(new Uint8Array(hash));
    };

    const hashesMatch = (first, second) => {
        if (first.length !== second.length) return false;
        let difference = 0;
        for (let index = 0; index < first.length; index += 1) {
            difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
        }
        return difference === 0;
    };

    const showStorageError = (element, error) => {
        console.error("Property Hub demo authentication error:", error);
        setMessage(
            element,
            "Authentication could not be completed. Enable browser storage and open this site through localhost or HTTPS.",
            true
        );
    };

    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        const passwordInput = document.getElementById("password");
        const confirmationInput = document.getElementById("confirm-password");
        const message = document.getElementById("form-message");
        const submitButton = registerForm.querySelector('button[type="submit"]');

        const validatePasswords = () => {
            const matches = passwordInput.value === confirmationInput.value;
            confirmationInput.setCustomValidity(
                confirmationInput.value && !matches ? "Passwords do not match." : ""
            );
            if (confirmationInput.value && !matches) {
                setMessage(message, "Passwords do not match.", true);
            } else {
                setMessage(message, "", false);
            }
            return matches;
        };

        passwordInput.addEventListener("input", validatePasswords);
        confirmationInput.addEventListener("input", validatePasswords);

        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!registerForm.checkValidity()) {
                registerForm.reportValidity();
                return;
            }
            if (!validatePasswords()) {
                confirmationInput.focus();
                return;
            }

            submitButton.disabled = true;
            try {
                const usernameInput = document.getElementById("username");
                const username = usernameInput.value.trim();
                const normalizedUsername = username.toLowerCase();
                const users = getUsers();

                if (users.some((user) => user.username === normalizedUsername)) {
                    setMessage(message, "That username is already registered. Please choose another.", true);
                    return;
                }

                const salt = crypto.getRandomValues(new Uint8Array(16));
                const passwordHash = await hashPassword(passwordInput.value, salt);
                users.push({
                    username: normalizedUsername,
                    displayUsername: username,
                    fullName: document.getElementById("fullname").value.trim(),
                    email: document.getElementById("email").value.trim(),
                    phone: document.getElementById("phone").value.trim(),
                    salt: toHex(salt),
                    passwordHash
                });
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
                sessionStorage.setItem(SESSION_KEY, normalizedUsername);

                setMessage(message, "Account created. Opening your dashboard...", false);
                window.setTimeout(() => {
                    window.location.assign("dashboard.html");
                }, 800);
            } catch (error) {
                showStorageError(message, error);
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        const message = document.getElementById("login-message");
        const usernameInput = document.getElementById("username");

        const pendingMessage = sessionStorage.getItem("authMessage");
        if (pendingMessage) {
            setMessage(message, pendingMessage, true);
            sessionStorage.removeItem("authMessage");
        }

        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!loginForm.checkValidity()) {
                loginForm.reportValidity();
                return;
            }

            const submitButton = loginForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            try {
                const username = usernameInput.value.trim().toLowerCase();
                const users = getUsers();
                const user = users.find((account) => account.username === username);
                if (!user) {
                    setMessage(message, "Username or password is incorrect.", true);
                    return;
                }

                const candidateHash = await hashPassword(
                    document.getElementById("password").value,
                    fromHex(user.salt)
                );
                if (!hashesMatch(candidateHash, user.passwordHash)) {
                    setMessage(message, "Username or password is incorrect.", true);
                    return;
                }

                sessionStorage.setItem(SESSION_KEY, user.username);
                window.location.assign("dashboard.html");
            } catch (error) {
                showStorageError(message, error);
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    if (document.querySelector(".dashboard-main")) {
        const username = sessionStorage.getItem(SESSION_KEY);
        let user;

        try {
            user = getUsers().find((account) => account.username === username);
        } catch (error) {
            console.error("Property Hub demo session error:", error);
        }

        if (!user) {
            sessionStorage.removeItem(SESSION_KEY);
            sessionStorage.setItem("authMessage", "Please log in to view your dashboard.");
            window.location.replace("login.html");
            return;
        }

        const greeting = document.querySelector(".dashboard-heading h1");
        if (greeting) {
            greeting.textContent = `Welcome back, ${user.fullName || user.displayUsername}`;
        }

        document.getElementById("logout-link")?.addEventListener("click", (event) => {
            event.preventDefault();
            sessionStorage.removeItem(SESSION_KEY);
            window.location.assign("login.html");
        });
    }

    const usersTableBody = document.getElementById("users-table-body");
    if (usersTableBody) {
        try {
            const users = getUsers();
            usersTableBody.replaceChildren();

            if (users.length === 0) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");
                cell.colSpan = 6;
                cell.className = "user-list-message";
                cell.textContent = "No active users have registered yet.";
                row.append(cell);
                usersTableBody.append(row);
            } else {
                users.forEach((user) => {
                    const row = document.createElement("tr");
                    const values = [
                        user.fullName || user.displayUsername || "—",
                        user.displayUsername || user.username || "—",
                        user.email || "—",
                        user.phone || "—",
                        "Active",
                        "Hidden"
                    ];

                    values.forEach((value) => {
                        const cell = document.createElement("td");
                        cell.textContent = value;
                        row.append(cell);
                    });
                    usersTableBody.append(row);
                });
            }
        } catch (error) {
            console.error("Could not load Property Hub demo users:", error);
            usersTableBody.replaceChildren();
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 6;
            cell.className = "user-list-message";
            cell.textContent = "Unable to load demo accounts from browser storage.";
            row.append(cell);
            usersTableBody.append(row);
        }
    }
})();
