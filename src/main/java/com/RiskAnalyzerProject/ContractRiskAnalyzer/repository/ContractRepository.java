package com.RiskAnalyzerProject.ContractRiskAnalyzer.repository;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.RiskAnalyzerProject.ContractRiskAnalyzer.model.Contract;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContractRepository extends MongoRepository<Contract,String> {
    List<Contract> findByOwnerUsername(String ownerUsername);
    List<Contract> findByOwnerUsernameAndStatusIn(String ownerUsername, List<String> statuses);
    List<Contract> findByStatusIn(List<String> statuses);
    long deleteByOwnerUsername(String ownerUsername);

}
