const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDuplicateProposals() {
  console.log('🔧 Fixing duplicate proposals...');
  
  try {
    // Find duplicate proposals
    const duplicates = await prisma.$queryRaw`
      SELECT chefId, requestId, COUNT(*) as count
      FROM Proposal 
      GROUP BY chefId, requestId 
      HAVING COUNT(*) > 1
    `;
    
    console.log(`Found ${duplicates.length} duplicate proposal groups`);
    
    for (const duplicate of duplicates) {
      console.log(`Fixing duplicates for chef ${duplicate.chefId}, request ${duplicate.requestId}`);
      
      // Get all proposals for this chef+request, keep only the latest one
      const proposals = await prisma.proposal.findMany({
        where: {
          chefId: duplicate.chefId,
          requestId: duplicate.requestId
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Keep the first (latest) proposal, delete the rest
      const toKeep = proposals[0];
      const toDelete = proposals.slice(1);
      
      console.log(`Keeping proposal ${toKeep.id}, deleting ${toDelete.length} duplicates`);
      
      for (const proposal of toDelete) {
        await prisma.proposal.delete({ where: { id: proposal.id } });
      }
    }
    
    console.log('✅ Duplicate proposals fixed');
    
  } catch (error) {
    console.error('❌ Failed to fix duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicateProposals();
