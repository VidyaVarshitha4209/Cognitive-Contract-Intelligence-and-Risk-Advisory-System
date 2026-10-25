import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_optional_user
from app.models.user import User
from app.models.contract import Contract
from app.models.chat import ChatMessage
from app.schemas.chat import ChatRequest, ChatResponse, ChatHistoryOut, ChatSource
from app.services.rag_service import rag_service
from app.services.ai_service import ai_service

router = APIRouter(prefix="/chat", tags=["Contract Chatbot"])

@router.post("/contract/{contract_id}", response_model=ChatResponse)
def ask_contract_question(
    contract_id: str,
    chat_req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user)
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    query = chat_req.message.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Empty query provided.")

    # 1. Retrieve relevant chunks using RAG
    relevant_chunks = rag_service.retrieve_relevant_chunks(contract_id, query, top_k=4)

    # 2. Record User message in DB
    user_msg = ChatMessage(
        contract_id=contract_id,
        user_id=current_user.id,
        role="user",
        content=query,
        source_references=None
    )
    db.add(user_msg)
    db.commit()

    # 3. Generate grounded AI response
    ai_result = ai_service.answer_chat_question(
        question=query,
        contract_title=contract.title or contract.filename,
        retrieved_chunks=relevant_chunks
    )

    sources_json = json.dumps(ai_result["sources"])

    # 4. Record Assistant response in DB
    assistant_msg = ChatMessage(
        contract_id=contract_id,
        user_id=current_user.id,
        role="assistant",
        content=ai_result["answer"],
        source_references=sources_json
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    sources_objs = [ChatSource(**s) for s in ai_result["sources"]]

    return ChatResponse(
        id=assistant_msg.id,
        role=assistant_msg.role,
        content=assistant_msg.content,
        source_references=sources_objs,
        created_at=assistant_msg.created_at
    )

@router.get("/contract/{contract_id}/history", response_model=ChatHistoryOut)
def get_chat_history(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user)
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.contract_id == contract_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    res = []
    for m in msgs:
        sources = []
        if m.source_references:
            try:
                raw = json.loads(m.source_references)
                sources = [ChatSource(**s) for s in raw]
            except Exception:
                pass
        res.append(
            ChatResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                source_references=sources,
                created_at=m.created_at
            )
        )

    return ChatHistoryOut(messages=res)

@router.delete("/contract/{contract_id}/history")
def clear_chat_history(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user)
):
    db.query(ChatMessage).filter(ChatMessage.contract_id == contract_id).delete()
    db.commit()
    return {"message": "Chat history cleared."}
