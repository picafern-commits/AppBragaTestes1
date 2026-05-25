
// ===== REAL FIREBASE USER UPDATE FIX =====

(function(){

  function attachEditTracking(){

    document.querySelectorAll("[data-user-id]").forEach((btn)=>{

      btn.onclick = function(){

        window.currentEditingUserId =
          this.dataset.userId;

      };

    });

  }

  const observer = new MutationObserver(()=>{
    attachEditTracking();
  });

  observer.observe(document.body,{
    childList:true,
    subtree:true
  });

})();
