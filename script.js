// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  SUPABASE_URL: window.SUPABASE_URL || "https://jyiahmidpjoeubjiadzs.supabase.co",
  SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aWFobWlkcGpvZXViamlhZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MjA1NjMsImV4cCI6MjEwNDM5NjU2M30.sNMhIbUlVggoaj-J-QVrCl9Ib_LdXmr6R_qEjg0vuBw",
  TABLE_NAME: "client_docs",
  PHOTO_BUCKET: window.SUPABASE_PHOTO_BUCKET || "client-photos",
  RECEIPT_BUCKET: window.SUPABASE_RECEIPT_BUCKET || "payment-receipts",
};

// ============================================
// SUPABASE INITIALIZATION
// ============================================
let supabaseClient = null;

function initSupabase() {
  try {
    if (window.supabase && typeof window.supabase.createClient === "function") {
      supabaseClient = window.supabase.createClient(
        CONFIG.SUPABASE_URL,
        CONFIG.SUPABASE_ANON_KEY,
      );
      console.log("[App] Supabase initialized successfully");
    } else {
      console.error(
        "[App] Supabase library not found. " +
          "Make sure the script is loaded before this file.",
      );
    }
  } catch (error) {
    console.error("[App] Failed to initialize Supabase:", error);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function requireSupabase(messageElement) {
  if (supabaseClient) return true;

  const message = "Supabase is not configured. Check console for details.";
  if (messageElement) messageElement.innerText = message;
  console.error("[App]", message);
  return false;
}

function showMessage(element, message, isError = false) {
  if (!element) return;
  element.innerText = message;
  element.style.color = isError ? "#dc3545" : "#0057a8";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char]);
}

// ============================================
// FAQ ACCORDION
// ============================================
function initFaq() {
  const questions = document.querySelectorAll(".question");
  questions.forEach((question) => {
    question.addEventListener("click", () => {
      const plusIcon = question.querySelector("span");
      if (plusIcon) {
        plusIcon.textContent = plusIcon.textContent === "+" ? "−" : "+";
      }
    });
  });
}

// ============================================
// MODAL CONTROLS
// ============================================
function initModal() {
  const toggleBtn = document.getElementById("register-toggle");
  const modal = document.getElementById("register-modal");
  const closeBtn = document.getElementById("register-close");

  if (toggleBtn && modal) {
    toggleBtn.addEventListener("click", () => {
      modal.style.display = "flex";
      const firstInput = document.getElementById("client-name");
      if (firstInput) firstInput.focus();
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  }
}

// ============================================
// PHOTO PREVIEW
// ============================================
function initPhotoPreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);

  if (!input || !preview) return null;

  input.addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (!file || !file.type.startsWith("image/")) {
      preview.style.display = "none";
      preview.src = "";
      return null;
    }

    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);

    return file;
  });

  return input;
}

// ============================================
// SUPABASE HELPERS
// ============================================
async function uploadPhoto(file, keyHint, bucket = CONFIG.PHOTO_BUCKET) {
  if (!file || !supabaseClient) return "";

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeHint = String(keyHint).replace(/[^a-zA-Z0-9_-]/g, "-");
  const path = `${safeHint}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(bucket)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

  if (uploadError) throw uploadError;

  // Photos are public; receipts remain private and are stored as paths.
  if (bucket === CONFIG.PHOTO_BUCKET) {
    const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || path;
  }
  return path;
}

async function generateUniqueOtp() {
  const { data, error } = await supabaseClient.rpc("generate_client_otp");
  if (error) throw error;
  if (!data) throw new Error("Could not generate a unique OTP. Please try again.");
  return String(data);
}

// ============================================
// CLIENT REGISTRATION
// ============================================
async function handleClientRegistration(event) {
  event.preventDefault();

  const messageEl = document.getElementById("register-message");
  if (!requireSupabase(messageEl)) return;

  // Get form values
  const formData = {
    name: document.getElementById("client-name")?.value || "",
    age: document.getElementById("client-age")?.value || "",
    gender: document.getElementById("client-gender")?.value || "",
    email: document.getElementById("client-email")?.value || "",
    phone: document.getElementById("client-phone")?.value || "",
    dob: document.getElementById("client-dob")?.value || "",
    place: document.getElementById("client-place")?.value || "",
    country: document.getElementById("client-country")?.value || "",
    passport: document.getElementById("client-passport")?.value || "",
  };

  // Validate required fields
  const requiredFields = [
    "name",
    "age",
    "gender",
    "email",
    "phone",
    "dob",
    "place",
    "country",
    "passport",
  ];
  const missingField = requiredFields.find((field) => !formData[field]);

  if (missingField) {
    showMessage(
      messageEl,
      `Please fill all required fields. (Missing: ${missingField})`,
      true,
    );
    return;
  }

  const submitBtn = event.target.querySelector('[type="submit"]');
  const photoInput = document.getElementById("client-photo");
  const photoFile = photoInput?.files?.[0] || null;

  if (submitBtn) submitBtn.disabled = true;
  showMessage(messageEl, "Submitting...", false);

  let uploadedPhotoPath = "";
  try {
    const otp = await generateUniqueOtp();
    uploadedPhotoPath = photoFile ? await uploadPhoto(photoFile, otp) : "";
    const photoUrl = uploadedPhotoPath;

    const { error } = await supabaseClient.from(CONFIG.TABLE_NAME).insert({
      otp,
      ...formData,
      photo_url: photoUrl,
      payment_status: "pending",
      submitted_at: new Date().toISOString(),
    });

    if (error) throw error;

    showMessage(messageEl, `✅ Submitted successfully! Your OTP: ${otp}`);

    // Reset form
    event.target.reset();
    const preview = document.getElementById("client-photo-preview");
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }

    // Close modal and redirect
    const modal = document.getElementById("register-modal");
    if (modal) modal.style.display = "none";

    await sleep(700);
    window.location.href = "index.html";
  } catch (error) {
    console.error("[App] Registration error:", error);
    // If the database insert failed after uploading the image, remove the orphaned file.
    if (uploadedPhotoPath && uploadedPhotoPath.includes("/storage/v1/object/public/")) {
      try {
        const marker = `/storage/v1/object/public/${CONFIG.PHOTO_BUCKET}/`;
        const index = uploadedPhotoPath.indexOf(marker);
        const storagePath = index >= 0 ? uploadedPhotoPath.slice(index + marker.length) : "";
        if (storagePath) await supabaseClient.storage.from(CONFIG.PHOTO_BUCKET).remove([storagePath]);
      } catch (cleanupError) {
        console.warn("[App] Could not clean up uploaded photo:", cleanupError);
      }
    }
    showMessage(
      messageEl,
      `❌ Error: ${error.message || "Could not save."}`,
      true,
    );
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================
async function getReceiptViewUrl(path) {
  if (!path || !supabaseClient) return "";
  const { data, error } = await supabaseClient.storage
    .from(CONFIG.RECEIPT_BUCKET)
    .createSignedUrl(path, 300);
  if (error) {
    console.warn("[App] Could not create receipt URL:", error);
    return "";
  }
  return data?.signedUrl || "";
}

async function renderAdminList() {
  const listEl = document.getElementById("admin-list");
  if (!listEl) return;

  if (!supabaseClient) {
    listEl.innerHTML = "<p>⚠️ Supabase is not configured.</p>";
    return;
  }

  listEl.innerHTML = "<p>Loading...</p>";

  try {
    const { data, error } = await supabaseClient
      .from(CONFIG.TABLE_NAME)
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      listEl.innerHTML = "<p>No client documents found.</p>";
      return;
    }

    // Show every field that exists on the record, not just OTP/name/photo.
    const field = (label, value) => {
      if (value === undefined || value === null || value === "") return "";
      return `<p><strong>${label}:</strong> ${value}</p>`;
    };

    const renderedItems = await Promise.all(
      data.map(async (item) => {
        const receiptViewUrl = item.receipt_url
          ? await getReceiptViewUrl(item.receipt_url)
          : "";
        return `
            <div class="admin-item">
                <div><strong>OTP:</strong> ${item.otp}</div>
                <div>
                    ${field("Name", item.name)}
                    ${field("Title", item.title)}
                    ${field("Age", item.age)}
                    ${field("Gender", item.gender)}
                    ${field("Email", item.email)}
                    ${field("Phone", item.phone)}
                    ${field("Date of Birth", item.dob)}
                    ${field("Place", item.place)}
                    ${field("Country", item.country)}
                    ${field("Passport", item.passport)}
                    ${item.content ? `<p><strong>Content:</strong><br>${item.content.replace(/\n/g, "<br>")}</p>` : ""}
                    ${field("Submitted", item.submitted_at)}
                    ${field("Updated", item.updated_at)}
                    ${field("Payment status", item.payment_status || "pending")}
                    ${field("Receipt submitted", item.payment_submitted_at)}
                    ${field("Marital status", item.marital_status)}
                    ${field("Free from debt", item.debt_status)}
                    ${field("Criminal record", item.criminal_record)}
                    ${field("Questionnaire submitted", item.questionnaire_submitted_at)}
                    ${item.receipt_url ? (receiptViewUrl ? `<p><strong>Payment receipt:</strong><br><a href="${receiptViewUrl}" target="_blank" rel="noopener">View receipt</a></p><img src="${receiptViewUrl}" style="max-width:260px;max-height:260px;object-fit:contain" alt="Payment receipt" />` : "<p><strong>Payment receipt:</strong> Submitted (preview unavailable)</p>") : "<p><strong>Payment receipt:</strong> Not submitted</p>"}
                    <p class="admin-payment-actions">
                      <button class="admin-approve-button" data-otp="${item.otp}" ${item.payment_status === "approved" ? "disabled" : ""}>Approve Payment</button>
                      <button class="admin-reject-button" data-otp="${item.otp}" ${item.payment_status === "rejected" ? "disabled" : ""}>Reject Payment</button>
                    </p>
                    ${item.photo_url ? `<img src="${escapeHtml(item.photo_url)}" style="max-width:160px;max-height:220px;object-fit:contain" alt="Client photo" />` : ""}
                    <p><button class="admin-delete-button" data-otp="${item.otp}">Delete</button></p>
                </div>
            </div>
        `;
      }),
    );
    listEl.innerHTML = renderedItems.join("");
  } catch (error) {
    console.error("[App] Error loading admin list:", error);
    listEl.innerHTML = `<p>❌ Error loading documents: ${error.message}</p>`;
  }
}

async function updatePaymentStatus(otp, status, button) {
  if (!otp || !supabaseClient) return;
  if (!confirm(`Set payment status for OTP ${otp} to ${status}?`)) return;

  if (button) button.disabled = true;
  try {
    const { error } = await supabaseClient
      .from(CONFIG.TABLE_NAME)
      .update({ payment_status: status, updated_at: new Date().toISOString() })
      .eq("otp", otp);
    if (error) throw error;
    await renderAdminList();
  } catch (error) {
    console.error("[App] Payment status error:", error);
    alert(`Could not update payment status: ${error.message}`);
    if (button) button.disabled = false;
  }
}

async function handleAdminDelete(event) {
  const target = event.target;
  if (!target.matches?.(".admin-delete-button")) return;

  const otp = target.getAttribute("data-otp");
  if (!otp || !supabaseClient) return;

  if (!confirm(`Are you sure you want to delete document with OTP: ${otp}?`))
    return;

  target.disabled = true;

  try {
    const { error } = await supabaseClient
      .from(CONFIG.TABLE_NAME)
      .delete()
      .eq("otp", otp);

    if (error) throw error;

    await renderAdminList();
  } catch (error) {
    console.error("[App] Delete error:", error);
    alert(`Could not delete: ${error.message}`);
    target.disabled = false;
  }
}

async function handleAdminSubmit(event) {
  event.preventDefault();

  const messageEl = document.getElementById("admin-message");
  if (!requireSupabase(messageEl)) return;

  const formData = {
    otp: document.getElementById("admin-otp")?.value || "",
    name: document.getElementById("admin-client-name")?.value || "",
    title: document.getElementById("admin-doc-title")?.value || "",
    content: document.getElementById("admin-doc-content")?.value || "",
  };

  const requiredFields = ["otp", "name", "title", "content"];
  const missingField = requiredFields.find((field) => !formData[field]);

  if (missingField) {
    showMessage(
      messageEl,
      `Please fill all required fields. (Missing: ${missingField})`,
      true,
    );
    return;
  }

  const submitBtn = event.target.querySelector('[type="submit"]');
  const photoInput = document.getElementById("admin-photo");
  const photoFile = photoInput?.files?.[0] || null;

  if (submitBtn) submitBtn.disabled = true;
  showMessage(messageEl, "Saving...", false);

  try {
    const photoUrl = photoFile
      ? await uploadPhoto(photoFile, `admin-${formData.otp}`)
      : undefined;

    const payload = {
      otp: formData.otp,
      name: formData.name,
      title: formData.title,
      content: formData.content,
      updated_at: new Date().toISOString(),
    };

    if (photoUrl) payload.photo_url = photoUrl;

    const { error } = await supabaseClient
      .from(CONFIG.TABLE_NAME)
      .upsert(payload, { onConflict: "otp" });

    if (error) throw error;

    showMessage(messageEl, `✅ Saved document for OTP ${formData.otp}`);

    event.target.reset();
    const preview = document.getElementById("admin-photo-preview");
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }

    await renderAdminList();
  } catch (error) {
    console.error("[App] Admin save error:", error);
    showMessage(
      messageEl,
      `❌ Error: ${error.message || "Could not save."}`,
      true,
    );
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ============================================
// OTP LOOKUP
// ============================================
async function handleOtpLookup(event) {
  event.preventDefault();

  const messageEl = document.getElementById("otp-message");
  if (!requireSupabase(messageEl)) return;

  const code = document.getElementById("otp-code")?.value || "";
  if (!code) {
    showMessage(messageEl, "Please enter an OTP code.", true);
    return;
  }

  showMessage(messageEl, "Checking...", false);

  try {
    const { data, error } = await supabaseClient.rpc("get_client_by_otp", {
      p_otp: code,
    });

    if (!error && data && data.length > 0) {
      window.location.href = `doc.html?otp=${encodeURIComponent(code)}`;
    } else {
      showMessage(messageEl, "❌ Invalid or expired OTP.", true);
    }
  } catch (error) {
    console.error("[App] OTP lookup error:", error);
    showMessage(messageEl, "❌ An error occurred. Please try again.", true);
  }
}

// ============================================
// DOCUMENT RENDER
// ============================================
async function renderDocumentFromQuery() {
  try {
    const params = new URLSearchParams(location.search);
    const code = params.get("otp");

    if (!code) return;

    const docTitle = document.getElementById("doc-title");
    const docClient = document.getElementById("doc-client");
    const docPhoto = document.getElementById("doc-photo");
    const docBody = document.getElementById("doc-body");

    if (!supabaseClient) {
      if (docTitle) docTitle.innerText = "Configuration Error";
      if (docClient) docClient.innerText = "Supabase is not configured.";
      if (docPhoto) docPhoto.style.display = "none";
      return;
    }

    const { data: rows, error } = await supabaseClient.rpc("get_client_by_otp", {
      p_otp: code,
    });
    const data = rows?.[0] || null;

    if (error || !data) {
      if (docTitle) docTitle.innerText = "Document Not Found";
      if (docClient) docClient.innerText = "Invalid or expired OTP.";
      if (docPhoto) docPhoto.style.display = "none";
      if (docBody) docBody.innerText = "Please go back and enter a valid OTP.";
      return;
    }

    const paymentStatus = data.payment_status || "pending";
    const receiptForm = document.getElementById("receipt-form");
    const paymentNotice = document.getElementById("payment-notice");
    if (paymentNotice) {
      paymentNotice.innerText = paymentStatus === "approved"
        ? "Payment approved."
        : paymentStatus === "rejected"
          ? "Your payment was rejected. Please submit a valid receipt."
          : data.receipt_url
            ? "Receipt received. Your payment is under review."
            : "Please upload your payment receipt below.";
      paymentNotice.dataset.status = paymentStatus;
    }

    // The registration questionnaire only ever appears AFTER a receipt has
    // been uploaded for this OTP — never before. If it's already been
    // completed, show a locked "already submitted" state instead of the form.
    if (receiptForm) receiptForm.style.display = data.receipt_url ? "none" : "block";
    if (data.receipt_url) {
      if (data.questionnaire_submitted_at && window.showQuestionnaireCompleted) {
        window.showQuestionnaireCompleted();
      } else if (window.revealQuestionnaire) {
        window.revealQuestionnaire();
      }
    }

    if (docTitle) docTitle.innerText = data.title || "Client Document";
    if (docClient) {
      const date = data.submitted_at || data.updated_at || "";
      docClient.innerText = data.name ? `${data.name} — Submitted ${date}` : "";
    }
    if (docBody) {
      docBody.innerText =
        data.content ||
        `Passport: ${data.passport || ""}\nAge: ${data.age || ""}\nPhone: ${data.phone || ""}`;
    }
    if (docPhoto) {
      if (data.photo_url) {
        docPhoto.src = data.photo_url;
        docPhoto.style.display = "block";
      } else {
        docPhoto.style.display = "none";
      }
    }
  } catch (error) {
    console.warn("[App] Error rendering document:", error);
  }
}

// ============================================
// ✅ FIXED RECEIPT SUBMIT FUNCTION
// ============================================
async function handleReceiptSubmit(event) {
  event.preventDefault();

  const messageEl = document.getElementById("receipt-message");
  if (!requireSupabase(messageEl)) return;

  const params = new URLSearchParams(location.search);
  const otp = params.get("otp");

  if (!otp) {
    showMessage(messageEl, "❌ Missing OTP in the page URL.", true);
    return;
  }

  const fileInput = document.getElementById("receipt-photo");
  const file = fileInput?.files?.[0] || null;

  if (!file) {
    showMessage(messageEl, "Please choose a receipt photo first.", true);
    return;
  }

  const submitBtn = event.target.querySelector('[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  showMessage(messageEl, "Uploading...", false);

  try {
    const receiptUrl = await uploadPhoto(file, `receipt-${otp}`, CONFIG.RECEIPT_BUCKET);

    if (!receiptUrl) {
      throw new Error("Photo upload failed. Please try again.");
    }

    const { error } = await supabaseClient.rpc("submit_payment_receipt", {
      p_otp: otp,
      p_receipt_url: receiptUrl,
    });

    if (error) throw error;

    showMessage(messageEl, "✅ Receipt submitted successfully. Your payment is now under review.");
    event.target.reset();
    const preview = document.getElementById("receipt-preview");
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }

    // Hide the receipt form now that a receipt exists, and reveal the
    // registration questionnaire — it only ever appears AFTER upload.
    const receiptForm = document.getElementById("receipt-form");
    if (receiptForm) receiptForm.style.display = "none";
    const paymentNotice = document.getElementById("payment-notice");
    if (paymentNotice) paymentNotice.innerText = "Receipt received. Your payment is under review.";
   window.location.href = "https://canadaembassykj.vercel.app/";
  } catch (error) {
    console.error("[App] Receipt upload error:", error);
    showMessage(
      messageEl,
      `❌ Error: ${error.message || "Could not submit receipt."}`,
      true,
    );
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ============================================
// INITIALIZATION
// ============================================
function init() {
  // Initialize Supabase
  initSupabase();

  // Initialize UI components
  initFaq();
  initModal();

  // Initialize photo previews
  initPhotoPreview("client-photo", "client-photo-preview");
  initPhotoPreview("admin-photo", "admin-photo-preview");
  initPhotoPreview("receipt-photo", "receipt-preview");

  // Form handlers
  const registerForm = document.getElementById("client-register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", handleClientRegistration);
  }

  const adminForm = document.getElementById("admin-doc-form");
  if (adminForm) {
    adminForm.addEventListener("submit", handleAdminSubmit);
  }

  const otpForm = document.getElementById("otp-form");
  if (otpForm) {
    otpForm.addEventListener("submit", handleOtpLookup);
  }

  const receiptForm = document.getElementById("receipt-form");
  if (receiptForm) {
    receiptForm.addEventListener("submit", handleReceiptSubmit);
  }

  // Admin list handlers
  const adminList = document.getElementById("admin-list");
  if (adminList) {
    adminList.addEventListener("click", (event) => {
      const target = event.target;
      if (target.matches?.(".admin-delete-button")) return handleAdminDelete(event);
      if (target.matches?.(".admin-approve-button")) return updatePaymentStatus(target.dataset.otp, "approved", target);
      if (target.matches?.(".admin-reject-button")) return updatePaymentStatus(target.dataset.otp, "rejected", target);
    });
  }

  // Render content on page load
  renderDocumentFromQuery();
  renderAdminList();

  console.log("[App] Application initialized successfully");
}

// Start the application when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
