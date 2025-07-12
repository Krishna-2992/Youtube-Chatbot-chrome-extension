from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from langchain.text_splitter import RecursiveCharacterTextSplitter
from typing import List
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate

class YoutubeRag: 
    def get_video_transcript(self, video_id: str):
        print('inside get_video_transcript')
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=["en"])
            transcript = " ".join(chunk["text"] for chunk in transcript_list)
            return transcript
        except TranscriptsDisabled: 
            print("TranscriptsDisabled")
            return "TranscriptsDisabled"
        except NoTranscriptFound as e:
            print("NoTranscriptFound: English transcript not available")
            print("="*100)
            print(e)
            print("="*100)
            return "NoTranscriptFound"
        except Exception as e: 
            print("exception: ", e)
            return "Error while getting the transcript"
        
    def split_transcript(self, transcript: str): 
        print("inside split_transcript")
        try: 
            splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = splitter.create_documents([transcript])
            return chunks
        except Exception as e: 
            print("exception: ", e)
            return "Error while splitting the transcript"
        
    def retrieve_similar_doc_embeddings(self, chunks: List, question: str): 
        print("inside retrieve_similar_doc_embeddings")
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        vector_store = FAISS.from_documents(chunks, embeddings)
        retriever = vector_store.as_retriever(search_type="similarity", search_kwargs={"k":4})
        retrieved_docs = retriever.invoke(question)
        return retrieved_docs
    
    def generate_prompt(self, retrieved_docs: List, question: str): 
        prompt = PromptTemplate(
            template = """
                You are a helpful assistant. 
                Answer ONLY from the provided transcript context. 
                If the context is insufficient, just say that you don't know. 
                {context}
                Question: {question}
            """, 
            input_variables = ['context', 'question']
        )
        context_text = "\n\n".join(doc.page_content for doc in retrieved_docs)
        final_prompt = prompt.invoke({"context": context_text, "question": question})
        return final_prompt
    
    def generate_response(self, prompt: str): 
        print("inside generate prompt")
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
        answer = llm.invoke(prompt)
        return answer.content
        
    
    def youtube_rag(self, video_id: str, question: str): 
        print("inside youtube_rag")
        transcript: str = self.get_video_transcript(video_id)
        chunks: List = self.split_transcript(transcript)
        retrieved_docs = self.retrieve_similar_doc_embeddings(chunks, question)
        final_prompt = self.generate_prompt(retrieved_docs, question)
        model_response = self.generate_response(final_prompt)
        return model_response

