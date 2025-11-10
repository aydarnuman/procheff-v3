async function testFullFlow() {
  console.log('🧪 Testing full flow: Login -> List -> Detail\n');

  try {
    // 1. Login
    console.log('1️⃣ Testing login...');
    const loginRes = await fetch('http://localhost:8080/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'aydarnuman',
        password: 'Numan.43'
      })
    });

    const loginData = await loginRes.json();
    console.log('✅ Login successful!');
    console.log('📝 SessionId:', loginData.sessionId);

    const sessionId = loginData.sessionId;

    // 2. List
    console.log('\n2️⃣ Testing list...');
    const listRes = await fetch(`http://localhost:8080/list?sessionId=${sessionId}`);
    const listData = await listRes.json();

    console.log('✅ List fetched!');
    console.log('📊 Total tenders:', listData.count);
    console.log('📋 First 3 tenders:');
    listData.items.slice(0, 3).forEach((item: any, i: number) => {
      console.log(`\n${i + 1}. ${item.title}`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Kurum: ${item.organization}`);
      console.log(`   Şehir: ${item.city}`);
      console.log(`   Tarih: ${item.date}`);
    });

    // 3. Detail
    if (listData.items.length > 0) {
      const firstId = listData.items[0].id;
      console.log(`\n3️⃣ Testing detail for ID: ${firstId}...`);

      const detailRes = await fetch(`http://localhost:8080/detail/${firstId}?sessionId=${sessionId}`);
      const detailData = await detailRes.json();

      console.log('✅ Detail fetched!');
      console.log('📄 Title:', detailData.title);
      console.log('📂 Documents:', detailData.documents.length);
      if (detailData.documents.length > 0) {
        console.log('   First doc:', detailData.documents[0].title);
      }
    }

    console.log('\n🎉 ALL TESTS PASSED!');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testFullFlow();
