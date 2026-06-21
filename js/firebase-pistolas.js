
(function(){

  try{

    if(!window.db){
      console.error("Firebase DB indisponível");
      return;
    }

    const pistolasRef =
      window.db.collection("pistolas");

    // ===== LISTENER FIREBASE =====
    pistolasRef.onSnapshot((snapshot)=>{

      window.pistolasData =
        snapshot.docs.map(doc=>({
          idDoc: doc.id,
          firebaseId: doc.id,
          ...doc.data()
        }));

      console.log(
        "Pistolas Firebase:",
        window.pistolasData.length
      );

      if(typeof renderPistolas === "function"){
        renderPistolas(window.pistolasData);
      }

    });

    // ===== GUARDAR =====
    window.guardarPistola = async function(data){

      try{

        // EDITAR
        if(window.currentEditingPistolaId){

          await pistolasRef
            .doc(window.currentEditingPistolaId)
            .update(data);

        }else{

          // NOVA PISTOLA
          await pistolasRef.add(data);

        }

        console.log(
          "Pistola guardada"
        );

      }catch(e){

        console.error(
          "Erro guardar pistola:",
          e
        );

      }

    };

    // ===== EDITAR =====
    // Desativado: esta versão recebia o objeto inteiro e quebrava os botões que enviam ID.
    window.editarPistolaFirebaseLegacy = function(pistola){
      window.currentEditingPistolaId = pistola?.firebaseId || pistola?.idDoc;
      window.currentEditingPistola = pistola;
    };

  }catch(error){

    console.error(
      "Erro Firebase Pistolas:",
      error
    );

  }

})();

// ADD/EDIT pistolas fully rebuilt
