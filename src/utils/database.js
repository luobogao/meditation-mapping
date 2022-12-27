import { getFirestore, collection, getDocs } from 'firebase/firestore/lite';
export async function getData(db) {
    const coll = collection(db, 'testcollection');
    const snapshot = await getDocs(coll);
    const data = snapshot.docs.map(doc => doc.data());
    console.log(data)
}
