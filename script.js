"use strict";

const PropertyHub = (() => {
    const ready = (callback) => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", callback, { once: true });
        } else {
            callback();
        }
    };

    const setStatus = (element, message, isError = false) => {
        if (!element) return;

        element.textContent = message;
        element.classList.toggle("error", isError);
        element.classList.toggle("success", !isError);
        element.setAttribute("role", isError ? "alert" : "status");
    };

    const initLogin = () => {
        const form = document.querySelector('form[action*="login"]');
        if (!form) return;

        form.addEventListener("submit", (event) => {
            if (!form.checkValidity()) {
                event.preventDefault();
                form.reportValidity();
            }
        });
    };

    const initRegister = () => {
        const form = document.getElementById("register-form");
        if (!form) return;

        const password = document.getElementById("password");
        const confirmation = document.getElementById("confirm-password");
        const status = document.getElementById("form-message");

        const validatePasswords = () => {
            if (!password || !confirmation) return true;

            const matches = password.value === confirmation.value;
            confirmation.setCustomValidity(
                confirmation.value && !matches ? "Passwords do not match." : ""
            );
            return matches;
        };

        password?.addEventListener("input", validatePasswords);
        confirmation?.addEventListener("input", validatePasswords);

        form.addEventListener("submit", (event) => {
            if (!validatePasswords()) {
                event.preventDefault();
                setStatus(status, "Passwords do not match.", true);
                confirmation?.focus();
                return;
            }

            if (!form.checkValidity()) {
                event.preventDefault();
                form.reportValidity();
                return;
            }

            event.preventDefault();
            setStatus(status, "Account created successfully.");
        });
    };

    const initPayment = () => {
        const options = [...document.querySelectorAll(".payment-option")];
        const methodSelect = document.getElementById("payment-method");
        const form = document.getElementById("confirmation-form");

        options.forEach((option) => {
            option.addEventListener("click", () => {
                options.forEach((item) => item.classList.remove("selected"));
                option.classList.add("selected");

                if (methodSelect) {
                    methodSelect.value = option.dataset.method || "";
                }
            });
        });

        form?.addEventListener("submit", (event) => {
            event.preventDefault();

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const status = document.getElementById("form-message");
            setStatus(status, "Payment confirmation submitted.");
            form.reset();
        });
    };

    const initPropertySearch = () => {
        const search = document.getElementById("propertySearch");
        const type = document.getElementById("propertyType");
        const status = document.getElementById("propertyStatus");
        const price = document.getElementById("priceRange");
        const cards = [...document.querySelectorAll(".property-card")];
        const count = document.getElementById("propertyCount");

        if (!search && !type && !status && !price) return;

        const filterProperties = () => {
            const query = search?.value.trim().toLowerCase() || "";
            let visibleCount = 0;

            cards.forEach((card) => {
                const searchableText = card.textContent?.toLowerCase() || "";
                const matchesQuery = !query || searchableText.includes(query);
                const matchesType =
                    !type?.value || card.dataset.type === type.value;
                const matchesStatus =
                    !status?.value || card.dataset.status === status.value;

                let matchesPrice = true;
                if (price?.value) {
                    const rent = Number(card.dataset.price || 0);
                    if (price.value === "under-25000") matchesPrice = rent < 25000;
                    if (price.value === "25000-50000") {
                        matchesPrice = rent >= 25000 && rent <= 50000;
                    }
                    if (price.value === "over-50000") matchesPrice = rent > 50000;
                }

                const visible = matchesQuery && matchesType && matchesStatus && matchesPrice;
                card.hidden = !visible;
                if (visible) visibleCount += 1;
            });

            if (count) {
                count.textContent = `${visibleCount} ${visibleCount === 1 ? "property" : "properties"}`;
            }
        };

        [search, type, status, price].forEach((control) => {
            control?.addEventListener("input", filterProperties);
            control?.addEventListener("change", filterProperties);
        });

        filterProperties();
    };

    const initMaintenance = () => {
        const form = document.querySelector("#maintenance-form");
        if (!form) return;

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const status = form.querySelector(".form-message");

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            setStatus(status, "Maintenance request submitted.");
            form.reset();
        });
    };

    const initAnnouncements = () => {
        document.querySelectorAll(".announcement").forEach((announcement) => {
            announcement.setAttribute("tabindex", "0");
        });
    };

    const initContactForm = () => {
        const form = document.querySelector("#contact-form");
        if (!form) return;

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const status = form.querySelector(".form-message");

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            setStatus(status, "Your message has been sent.");
            form.reset();
        });
    };

    const init = () => {
        initLogin();
        initRegister();
        initPayment();
        initPropertySearch();
        initMaintenance();
        initAnnouncements();
        initContactForm();
    };

    ready(init);

    return {
        init,
        initLogin,
        initRegister,
        initPayment,
        initPropertySearch,
        initMaintenance,
        initAnnouncements,
        initContactForm,
    };
})();

window.PropertyHub = PropertyHub;
